---
name: Playwright test setup
description: Playwright Docker architecture, trigger mechanism, test file locations, fixtures, and Clerk auth pattern
type: project
---

## Architecture

Playwright runs in a dedicated `playwright` Docker service. Tests are triggered from the `app` container via `deno task e2e-test`, which connects via `PW_TEST_CONNECT_WS_ENDPOINT='ws://playwright:3000'` and starts the dev server (`START_DEV_SERVER=1`).

Config: `playwright.config.ts`. Base URL: `https://kanary.local.dev`. HTTPS errors ignored (self-signed cert). Runs Chromium + Firefox + WebKit. `retries: 1`.

## Running tests

```bash
deno task e2e-test
```

## Test files (`tests/playwright/`)

- `global.setup.ts` — one-time Clerk setup via `clerkSetup()` (runs as "setup" project, others depend on it)
- `fixtures.ts` — exports `test` (with auto Clerk fixture) and `testNoClerk` (plain base, no Clerk)
- `theme-toggle.spec.ts` — theme switching, localStorage persistence
- `board-config.spec.ts` — board configuration / create-row flow
- `task-url.spec.ts` — task deep-link URL behaviour
- `generate-tasks-api.spec.ts` — live POST /api/generate-tasks API call
- `board-persistence.spec.ts` — localStorage→KV migration on sign-in (chromium-only, shared Clerk account)

## Fixtures and Clerk

`fixtures.ts` exports two test variants:

```ts
// Wraps every test with setupClerkTestingToken — use ONLY for tests that need auth
export const test = base.extend<{ clerkSetup: void }>({
  clerkSetup: [async ({ page }, use) => {
    await setupClerkTestingToken({ page, options: { ... } });
    await use();
  }, { auto: true }],
});

// Plain base — no Clerk API calls, use for all non-auth tests
export const testNoClerk = base;
```

**All 4 current spec files use `testNoClerk`** because none of them test authenticated flows. `setupClerkTestingToken` hits `https://guided-bream-79.clerk.accounts.dev/v1/client` on every test; with 4 parallel browser workers it rate-limits (429) and causes React hydration delays in Firefox/WebKit, producing flaky or failing tests.

**Rule:** only import `test` (Clerk-wrapped) from `fixtures.ts` in specs that actually test signed-in behaviour. Everything else uses `testNoClerk`.

## Standard test patterns

**beforeEach:**
```ts
await page.addInitScript(() => localStorage.clear());
await page.goto("/");
```
Clears localStorage before React initializes → predictable state.

**Board config panel:**
```ts
await page.locator("#board-config-collapse-toggle").click();
await expect(page.locator("#board-config-create-new-row")).toBeVisible();
```
`BoardController` is `client:only="react"` — the toggle only exists after React hydration.

**Opening task create modal:**
```ts
// Wait for board to render first — evaluate fires before React mounts otherwise
await page.waitForSelector("button:has(.hugeicons--credit-card-add)");
await page.evaluate(() => {
  (document.querySelector("button:has(.hugeicons--credit-card-add)") as HTMLButtonElement)?.click();
});
await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();
```
Direct click hits strict-mode violations (3 buttons match). Use `evaluate` or scope to a column locator. `waitForSelector` is required first — the board is loaded from `/api/board` via a useEffect after mount, so the buttons don't exist immediately after `goto`.

**Filling the task title input:**
```ts
await page.getByRole("group", { name: "Title" }).getByRole("textbox").fill("...");
```
`dialog input[type='text']` matches 3 elements (title + two checklist inputs). Scope via the `fieldset` group role instead.

**MCP browser quirk (mcp_playwright service):** `browser_click` throws `EACCES: permission denied, mkdir '/var/dev'` but the click executes — verify with `browser_snapshot`.

## Signing in within a test (`clerk.signIn`)

This Clerk instance requires an `email_code` second factor on password sign-in
(`signIn.status === "needs_second_factor"` even after a correct password).
`clerk.signIn`'s `signInParams: {strategy: "password", ...}` branch does NOT
handle second factors and silently leaves `Clerk.user`/`Clerk.session` null —
no error is thrown.

**Use the ticket-based approach instead**, which bypasses second factors entirely
and resolves once `Clerk.user` is set:
```ts
await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
```
This requires `CLERK_SECRET_KEY` (Backend API creates a sign-in token).

`global.setup.ts`'s "global setup" step provisions `E2E_CLERK_USER_EMAIL` /
`E2E_CLERK_USER_PASSWORD` as a real Clerk user via `npm:@clerk/backend`'s
`createClerkClient` if one doesn't already exist (`users.getUserList` →
`users.createUser`).

## localStorage → KV migration on sign-in

`BoardContext`'s migration effect runs once on mount keyed on
`[boardId, isAuthenticated]` — it is NOT reactive. After `clerk.signIn`,
`page.reload()` is required for SSR to recompute `isAuthenticated` and trigger
migration. Migration only fires if `GET /api/board` 404s, so delete any
leftover board first:
```ts
await page.request.delete("/api/board");
const migrated = page.waitForResponse((res) =>
  res.url().includes("/api/board") && res.request().method() === "PUT"
);
await page.reload();
await migrated;
```

**Strict-mode violation after migration:** `page.getByText(rowName)` matches
both the row's `<h3>` heading on the board AND the `<h4>` entry in
`#board-config-row-display-settings` (present in the DOM even when the panel
is visually collapsed). Scope to the row section locator instead, e.g.
`newRow.getByText(rowName)`.
