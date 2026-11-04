---
name: project-kanby-cli-login
description: kanby CLI login — Clerk OAuth PKCE flow, Clerk dashboard app settings (redirect URIs, scopes, public client), .env values, devcontainer port 8976 forwarding, paste fallback, debugging history
metadata:
  type: project
---

How `kanby user login` works and how it's configured (as of 2026-11-03). Part of [[project-kanby-cli]].

**Flow (`cli/auth.ts`, modeled on github.com/clerk/cli-auth-example):** PKCE S256 + state → opens `{issuer}/oauth/authorize` via `$BROWSER` first (VS Code devcontainer helper that opens the HOST browser; no xdg-open in container) → one-shot `Deno.serve` on `127.0.0.1:8976/callback` (falls back to random port if busy) → exchanges code at `{issuer}/oauth/token` → tokens saved per issuer in `~/.config/kanby/credentials.json` (0600). Auto-refresh within 30s of expiry; `logout` revokes at `/oauth/token/revoke`. 5-min timeout.
- **Paste fallback:** while waiting, stdin is read async; user can paste the full redirect URL (`http://127.0.0.1:8976/callback?code=…&state=…`) from a hung browser tab. State is still verified.

**Why port 8976 is fixed:** in the Docker devcontainer the browser's redirect to a random 127.0.0.1 port hung (VS Code auto-forward too late / not at all). `.devcontainer/devcontainer.json` now has `"forwardPorts": [8976]` + portsAttributes label "kanby CLI login". Needs a VS Code "Reload Window"/container reload to take effect (or forward 8976 manually in Ports panel). The user was reloading the container on 2026-11-03 — real end-to-end login had NOT yet been confirmed working.

**Clerk dashboard (dev instance `guided-bream-79`), OAuth app "Local Kanby CLI":**
- Client ID `eizGFA6Cls03tJaz` (public identifier, not a secret). Never use/store its client secret in the CLI.
- Must be a **Public** client (PKCE). Screenshot showed a Client Secret field → verify Public is on, else token exchange fails (invalid_client).
- Redirect URIs (Clerk says exact match): add `http://127.0.0.1:8976/callback`; keep `http://127.0.0.1/callback`. `https://kanby.local.dev/callback` isn't needed by the CLI.
- Scopes: CLI requests `profile email offline_access` → app must tick **email** and **profile**; `offline_access` is auto-included (greyed); `openid` harmless; leave `private_metadata` off.

**Config (`cli/config.ts`):** reads env vars, else only `KANBY_*` lines + `PUBLIC_CLERK_PUBLISHABLE_KEY` from `./.env` (never the app's secrets). Empty values = unset (an empty `KANBY_API_URL=` was a bug, fixed).
- `KANBY_API_URL` default `https://kanary.local.dev` (`http://localhost:4321` also works; kanary.local.dev returned 502 via proxy once — unexplained).
- `KANBY_CLERK_ISSUER` optional — derived from publishable key (base64 Frontend API host) → `https://guided-bream-79.clerk.accounts.dev`.
- `KANBY_CLERK_OAUTH_CLIENT_ID` required. User's `.env` has all three set.
- `deno task cli` sets `DENO_TLS_CA_STORE=system` for the local mkcert TLS on kanary.local.dev.

**Server side:** `@clerk/astro` middleware authenticates with `acceptsToken: "any"`, so the CLI routes (`cliRoute` in `src/lib/api/route.ts`; not every `/api/v1/*` route, since the web app's routes moved there too) use `locals.auth({ acceptsToken: "oauth_token" })` (auth object has `userId`). Verified on dev server: no token / bogus token → 401.
