import { config } from "./config.ts";
import { CliError } from "./errors.ts";

// Clerk OAuth (authorization code + PKCE) for a public client, as in
// https://github.com/clerk/cli-auth-example: a one-shot server on 127.0.0.1
// receives the redirect, and tokens are kept in a 0600 file per Clerk issuer.

interface Tokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // ms since epoch
}

const SCOPES = "profile email offline_access";
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
// Fixed, so a dev container can forward it ahead of time (forwardPorts in
// .devcontainer/devcontainer.json); a random port is forwarded too late, if
// at all, and the browser's redirect back hangs.
const CALLBACK_PORT = 8976;
// Refresh this long before the access token expires.
const REFRESH_MARGIN_MS = 30 * 1000;

function credentialsPath(): string {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE");
  if (!home) throw new CliError("Can't find your home directory.");
  const base = Deno.env.get("XDG_CONFIG_HOME") ?? `${home}/.config`;
  return `${base}/kanby/credentials.json`;
}

function oauthConfig() {
  const { clerkIssuer, clerkClientId } = config;
  if (!clerkIssuer || !clerkClientId) {
    throw new CliError(
      "Set KANBY_CLERK_ISSUER and KANBY_CLERK_OAUTH_CLIENT_ID (see cli/README.md).",
    );
  }
  return { issuer: clerkIssuer, clientId: clerkClientId };
}

async function readAll(): Promise<Record<string, Tokens>> {
  try {
    return JSON.parse(await Deno.readTextFile(credentialsPath()));
  } catch {
    return {};
  }
}

async function writeTokens(issuer: string, tokens: Tokens | null) {
  const all = await readAll();
  if (tokens) all[issuer] = tokens;
  else delete all[issuer];
  const path = credentialsPath();
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeTextFile(path, JSON.stringify(all, null, 2), { mode: 0o600 });
}

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_")
    .replace(/=+$/, "");

export async function pkcePair(): Promise<
  { verifier: string; challenge: string }
> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

async function requestTokens(
  issuer: string,
  params: Record<string, string>,
): Promise<Tokens> {
  const res = await fetch(`${issuer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CliError(
      `Clerk rejected the token request: ${
        body.error_description ?? body.error ?? res.status
      }`,
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresAt: Date.now() + (body.expires_in ?? 0) * 1000,
  };
}

// $BROWSER first: in a VS Code dev container it opens the host's browser,
// where xdg-open doesn't exist.
function openBrowser(url: string) {
  const [cmd, ...args] = Deno.env.get("BROWSER")
    ? [Deno.env.get("BROWSER")!, url]
    : Deno.build.os === "darwin"
    ? ["open", url]
    : Deno.build.os === "windows"
    ? ["cmd", "/c", "start", "", url]
    : ["xdg-open", url];
  try {
    new Deno.Command(cmd, { args, stdout: "null", stderr: "null" }).spawn();
  } catch {
    // No browser opener; the URL is printed for the user to open.
  }
}

// Resolves with the first line of stdin that is a URL carrying ?code=, until
// `signal` aborts. Reads stdin asynchronously, unlike prompt(), so the
// callback server keeps serving meanwhile.
async function pastedRedirect(signal: AbortSignal): Promise<URL> {
  const reader = Deno.stdin.readable.pipeThrough(new TextDecoderStream())
    .getReader();
  signal.addEventListener("abort", () => reader.cancel().catch(() => {}));
  let buffered = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) return new Promise(() => {}); // stdin closed: never resolves
    buffered += value;
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop()!;
    for (const line of lines) {
      try {
        const url = new URL(line.trim());
        if (url.searchParams.has("code") || url.searchParams.has("error")) {
          return url;
        }
      } catch {
        // not a URL
      }
      console.error(
        "✖ Paste the whole address, starting with http://127.0.0.1",
      );
    }
  }
}

// Waits for Clerk's redirect back with ?code=&state= and returns the code.
// It normally reaches the one-shot server on 127.0.0.1. When it can't (the
// CLI is in a container or over SSH, so the browser's 127.0.0.1 is another
// machine), the user pastes the address the browser failed to load instead.
export async function receiveCode(
  state: string,
  onListen: (redirectUri: string) => void,
): Promise<string> {
  const done = new AbortController();
  const callback = new Promise<URL>((resolve) => {
    const handler = (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname !== "/callback") {
        return new Response("Not found", { status: 404 });
      }
      resolve(url);
      return new Response(
        url.searchParams.has("code")
          ? "Logged in to Kanby. You can close this tab."
          : "Login failed. Return to your terminal.",
      );
    };
    const serve = (port: number) =>
      Deno.serve({
        hostname: "127.0.0.1",
        port,
        signal: done.signal,
        onListen: ({ port }) => onListen(`http://127.0.0.1:${port}/callback`),
      }, handler);
    try {
      serve(CALLBACK_PORT);
    } catch (error) {
      if (!(error instanceof Deno.errors.AddrInUse)) throw error;
      serve(0); // any free port; the paste fallback still works
    }
  });
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(
      () => reject(new CliError("Login timed out.")),
      LOGIN_TIMEOUT_MS,
    );
    done.signal.addEventListener("abort", () => clearTimeout(id));
  });
  try {
    const url = await Promise.race([
      callback,
      pastedRedirect(done.signal),
      timeout,
    ]);
    const code = url.searchParams.get("code");
    if (url.searchParams.get("state") !== state) {
      throw new CliError("Login failed: state mismatch.");
    }
    if (!code) {
      throw new CliError(
        `Login failed: ${url.searchParams.get("error") ?? "no code returned"}.`,
      );
    }
    return code;
  } finally {
    done.abort();
  }
}

export async function login(): Promise<void> {
  const { issuer, clientId } = oauthConfig();
  const { verifier, challenge } = await pkcePair();
  const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));
  let redirectUri = "";
  const code = await receiveCode(state, (uri) => {
    redirectUri = uri;
    const url = new URL(`${issuer}/oauth/authorize`);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: uri,
      scope: SCOPES,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    console.log(
      `Opening your browser to log in. If it doesn't open, visit:\n\n${url}\n`,
    );
    console.log(
      "Waiting for you to log in… If the page you land on afterwards " +
        "doesn't load, paste its full address here and press Enter:",
    );
    openBrowser(url.toString());
  });
  const tokens = await requestTokens(issuer, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });
  await writeTokens(issuer, tokens);
}

// Revokes the refresh token (best effort) and forgets the stored tokens.
export async function logout(): Promise<boolean> {
  const { issuer, clientId } = oauthConfig();
  const tokens = (await readAll())[issuer];
  if (!tokens) return false;
  const token = tokens.refreshToken ?? tokens.accessToken;
  await fetch(`${issuer}/oauth/token/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token, client_id: clientId }),
  }).then((res) => res.body?.cancel()).catch(() => {});
  await writeTokens(issuer, null);
  return true;
}

// The stored access token, refreshed if it's about to expire; null if not
// logged in (or the refresh was refused).
export async function getAccessToken(): Promise<string | null> {
  const { issuer, clientId } = oauthConfig();
  const tokens = (await readAll())[issuer];
  if (!tokens) return null;
  if (Date.now() < tokens.expiresAt - REFRESH_MARGIN_MS) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) return null;
  try {
    const refreshed = await requestTokens(issuer, {
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: clientId,
    });
    refreshed.refreshToken ??= tokens.refreshToken;
    await writeTokens(issuer, refreshed);
    return refreshed.accessToken;
  } catch {
    await writeTokens(issuer, null);
    return null;
  }
}
