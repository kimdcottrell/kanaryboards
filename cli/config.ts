// Which Kanby environment the CLI talks to. Read from the environment, or
// from ./.env, where only the KANBY_* lines and the (public) Clerk
// publishable key are read: the app's .env also holds server secrets the CLI
// has no business loading.

function readDotEnv(): Record<string, string> {
  let text: string;
  try {
    text = Deno.readTextFileSync(".env");
  } catch {
    return {};
  }
  const vars: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(KANBY_\w+|PUBLIC_CLERK_PUBLISHABLE_KEY)\s*=\s*(.*?)\s*$/,
    );
    if (match) vars[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return vars;
}

const dotEnv = readDotEnv();
// Empty values (as in .env.sample) count as unset.
const env = (name: string) => Deno.env.get(name) || dotEnv[name] || undefined;

// A publishable key is "pk_test_" or "pk_live_" + base64("<frontend api>$"),
// and the Frontend API is the instance's OAuth issuer.
export function issuerFromPublishableKey(key: string): string | undefined {
  try {
    const host = atob(key.replace(/^pk_(test|live)_/, "")).replace(/\$$/, "");
    return host ? `https://${host}` : undefined;
  } catch {
    return undefined;
  }
}

const publishableKey = env("PUBLIC_CLERK_PUBLISHABLE_KEY");

export const config = {
  // https://kanary.local.dev (local Traefik) or http://localhost:4321.
  apiUrl: (env("KANBY_API_URL") ?? "https://kanary.local.dev").replace(
    /\/$/,
    "",
  ),
  // The Clerk instance's Frontend API URL, e.g. https://foo.clerk.accounts.dev.
  // Defaults to the one the app's publishable key points at.
  clerkIssuer: (env("KANBY_CLERK_ISSUER") ??
    (publishableKey && issuerFromPublishableKey(publishableKey)))?.replace(
      /\/$/,
      "",
    ),
  clerkClientId: env("KANBY_CLERK_OAUTH_CLIENT_ID"),
};
