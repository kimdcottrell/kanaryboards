---
name: Playwright test setup
description: Playwright Docker architecture, trigger mechanism, test file locations, fixtures, and Clerk auth pattern
type: project
---

## Architecture

Playwright runs in a dedicated `playwright` Docker service. Tests are triggered from the `app` container via `deno task e2e-test`, which connects via `PW_TEST_CONNECT_WS_ENDPOINT='ws://playwright:3000'` and (outside CI) Playwright's `webServer` runs `deno task build && deno task preview` on `localhost:8085` unless something is already serving there.

Config: `playwright.config.ts`. Base URL: `http://localhost:8085` locally, `BASE_URL` env in CI. `retries: 2`. Firefox/WebKit projects exist in the config, but neither `deno task e2e-test` nor CI (`e2e.yml`) runs them — both run only `chromium` + `chromium-shared-account`.

## Running tests

```bash
deno task e2e-test   # runs --project=chromium --project=chromium-shared-account
```

**`chromium-shared-account` project:** specs that wipe and re-seed the shared Clerk test account's KV board (`board-persistence`, `hero-start-form`, `drawer-row-list-mirror`, `drawer-row-nav`, `board-save-conflict`) are listed in `SHARED_ACCOUNT_SPECS` in `playwright.config.ts` and run in their own project with `workers: 1`, so they can't clobber each other's seed. A project-level `testIgnore` replaces the top-level one, so the `chromium` project repeats `**/preview-only/**` alongside `SHARED_ACCOUNT_SPECS`. Any new spec that touches the shared account's KV board belongs in that list.

## Test files (`tests/playwright/`)

- `global.setup.ts` — "setup" project (others depend on it): `clerkSetup()`, then signs in as the shared E2E account and saves its storage state to `AUTH_FILE` for `testAuthed`; `global.teardown.ts` deletes the E2E test data
- `fixtures.ts` — the four test variants (see Fixtures and Clerk below) and helpers, incl. `openSecondTab(page)` (a second page in the same context — shared localStorage + BroadcastChannel — used for cross-tab tests)
- `board-crud.spec.ts` — column/row/task CRUD, checklist toggle, drag-and-drop, Trash/restore (seeds `kanby-v0-1-0` localStorage directly)
- `board-cross-tab-sync.spec.ts` — BroadcastChannel / `BOARD/SYNC` between two tabs (uses `openSecondTab`)
- `task-comments.spec.ts` — comment post/edit/delete in the task modals
- `task-edit-drafts.spec.ts` — unsaved edit drafts (`task+${id}` localStorage), "edited but not saved" indicator, PostEditPreSaveAlert
- `task-url.spec.ts` — task deep-link URL behaviour
- `board-persistence.spec.ts` — localStorage→KV migration on sign-in (shared Clerk account; uses the Clerk-wrapped `test`)
- `board-save-conflict.spec.ts` — autosave vs a write made elsewhere: 409 then merged resend with no notice; a task changed on both sides keeps the server's version with `SaveConflictAlert` (shared Clerk account, `testAuthed`)
- `board-config.spec.ts`, `board-menu*.spec.ts`, `board-dock.spec.ts`, `dashboard-empty-state.spec.ts`, `drawer-row-*.spec.ts`, `render-isolation.spec.ts`, `hero-start-form.spec.ts`, `theme-toggle.spec.ts`, `generate-tasks-api.spec.ts`, plus non-board specs (blog, cookie consent, Clerk sign-up, unauth `/api/v1/board`)
- `preview-only/` — security specs; excluded by `testIgnore` in every project, so neither `e2e-test` nor CI currently runs them

## Fixtures and Clerk

`fixtures.ts` exports four test variants (plus helpers `fillStable`, `fillControlled`, `gotoAndWaitForClerk`, `openCreateRowModal`, `openSecondTab`):

- `test` — injects the Clerk testing token (FAPI route interception, retry-on-429); for specs that *become* signed in partway through (`board-persistence.spec.ts`: guest → account migration).
- `testNoClerk` — also injects the token but never signs in; for guest specs that load `/dashboard` (without the token the dev-browser handshake reloads the page and flakes the `html[data-board-loaded='true']` gate). Most guest board specs import it `as test`.
- `testNoClerkToken` — no route interception; for guest specs that never load `/dashboard` (blog, generate-tasks API). Fewer stranded-handler warnings at teardown.
- `testAuthed` — `testNoClerkToken` + `storageState: AUTH_FILE` (`tests/playwright/.clerk/user.json`, written by `global.setup.ts` after its own `clerk.signIn()`); starts signed in as the shared E2E account. Used by the shared-account specs (except `board-persistence`), `clerk-sign-up-trigger`, and `preview-only/board-api-security`.

**Seeding the shared account's KV board (signed-in specs):** `gotoAndWaitForClerk(page, "/blog")` first (refreshes the short-lived `__session` without mounting the board island, whose autosave would race the seed), then `page.request.delete("/api/v1/test-data")` and `page.request.patch("/api/v1/board", {data: {upserts, deletes}})` with no `If-Match` (unchecked). Seeds must satisfy the `fields.ts` rules (non-empty titles, a valid row color — labels like `"blue"` pass) or the PATCH returns 422. Clean up with `test-data` in `afterEach`. Such specs `test.skip(browserName !== "chromium")` and go in `SHARED_ACCOUNT_SPECS`.

**Writes "from elsewhere" (e.g. the CLI):** the CLI's routes need a Clerk OAuth token the E2E session can't get, so `board-save-conflict.spec.ts` stands in an unchecked `PATCH /api/v1/board` (same server effect: entity rewritten, `board_rev` bumped) and blocks `**/api/v1/board/events` so live refresh can't apply the write before the user's edit.

## Standard test patterns

**beforeEach:**
```ts
await page.addInitScript(() => localStorage.clear());
await page.goto("/");
```
Clears localStorage before React initializes → predictable state.

**Board config modal (gear button in BoardMenu):**
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
Direct click hits strict-mode violations (3 buttons match). Use `evaluate` or scope to a column locator. `waitForSelector` is required first — the board is loaded from `/api/v1/board` via a useEffect after mount, so the buttons don't exist immediately after `goto`.

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

The load/migration effect (`effects/useBoardPersistence.ts`) runs once on mount keyed on
`[boardId, isAuthenticated]` — it is NOT reactive. After `clerk.signIn`,
`page.reload()` is required for SSR to recompute `isAuthenticated` and trigger
migration. Migration only fires if `GET /api/v1/board` 404s, so delete any
leftover board first:
```ts
await page.request.delete("/api/v1/board");
const migrated = page.waitForResponse((res) =>
  res.url().includes("/api/v1/board") && res.request().method() === "PATCH"
);
await page.reload();
await migrated;
```

**Strict-mode violation after migration:** `page.getByText(rowName)` matches
both the row's `<h3>` heading on the board AND the `<h4>` entry in
`#board-config-row-display-settings` (present in the DOM even when the panel
is visually collapsed). Scope to the row section locator instead, e.g.
`newRow.getByText(rowName)`.

## DOM types in spec files (Deno)

Deno's default `lib` doesn't include `lib.dom.d.ts`, so any `page.evaluate`
that references `document`, `DragEvent`, `DataTransfer`, `Element`, etc. fails
`deno check` with "Cannot find name". Add this as the first line of the spec
file (verified no conflicts with Deno's own globals):
```ts
/// <reference lib="dom" />
```

## Simulating HTML5 drag-and-drop

**Update 2026-11-13:** in Chromium (the only browser `e2e-test`/CI run),
`locator.dragTo()` does work now: `board-save-conflict.spec.ts` drags
`article#task-sc-b` onto `#column-section-row-sc-1-col-sc-doing` with it and
asserts the move on screen and in KV. Try `dragTo` first; the manual dispatch
below is the fallback (it was needed when this was written, and may still be
for Firefox/WebKit — unverified).

Original finding: `locator.dragTo()` didn't trigger this app's drag handlers (it tracks
`draggedTask` in React state via `onDragStart`/`onDrop`, not
`dataTransfer` payload). Dispatching `dragstart`/`dragover`/`drop`/`dragend`
all in one `page.evaluate` also fails — React batches the `dragstart`
dispatch's state update, so `onDrop`'s closure still sees the stale
`draggedTask: null` when it runs synchronously after. Fix: dispatch
`dragstart` in its own `page.evaluate` round-trip (separate call = lets React
flush/re-render), then dispatch `dragover`/`drop`/`dragend` in a second call.
Use `page.evaluateHandle(() => new DataTransfer())` to share one
`DataTransfer` instance across both calls:
```ts
const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
await page.evaluate((dt) => {
  document.querySelector("article#task-x")!
    .dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }));
}, dataTransfer);
await page.evaluate((dt) => {
  const target = document.querySelector("...")!;
  const fire = (el: Element, type: string) =>
    el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
  fire(target, "dragover");
  fire(target, "drop");
  fire(document.querySelector("article#task-x")!, "dragend");
}, dataTransfer);
```
