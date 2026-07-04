---
name: debug-playwright-failures
description: Use when the user hands over a list of failing Playwright/e2e tests to fix, or asks to "debug failing playwright tests", "fix failing e2e tests", "work through playwright failures one at a time", "run playwright tests", or "check e2e". Works through failures one at a time — run a single test in isolation, debug it, propose a fix for approval, re-run, and only move on once it's green.
---

# Debug failing Playwright tests, one at a time

Given a list of failing e2e tests, work through them **one at a time** until each
passes. Do not batch-fix. For each failure: reproduce it in isolation, find the
root cause, propose a specific fix, get approval, apply it, re-run, confirm green,
then move to the next. When they're all green, run the full suite to catch
regressions.

Paths below are relative to the repo root (`/var/dev`).

## How tests run here (read once)

- `deno task e2e-test` → `deno task playwright test --project=chromium` with
  `START_DEV_SERVER=1`. Tests execute in the **remote `playwright` compose
  container** (`ws://playwright:3000`) driving a headless Chromium against
  **`https://kanary.local.dev`** (the traefik proxy hostname — not
  `localhost:4321`). **Chromium only.**
- Config ([playwright.config.ts](playwright.config.ts)): `retries: 2`,
  `expect.timeout: 10_000`, default test timeout `30_000`, `testDir:
  tests/playwright`, artifacts (`trace`/`screenshot`/`video`) retained on failure
  under `test-results/`.
- **`retries: 2` matters:** a test reported "flaky" **passed on a retry** — the
  first attempt failed, a later one succeeded. Treat flaky as a real failure to
  chase, not a pass.
- This container is **deno-only** (no `npm`/`npx`/`node`, no `unzip`).

## Step 1 — Get the list of failures

If the user pasted a list, use it. Otherwise produce one:

```bash
deno task e2e-test 2>&1 | tail -30
```

Keep the list somewhere visible (the failures are usually printed as
`[chromium] › tests/playwright/<file>:<line> › <describe> › <test title>`).

## Step 2 — Reproduce ONE failure in isolation

Take the **first** failure. Run just that test — match on the test title with `-g`
(a substring is fine; it's a regex):

```bash
deno task e2e-test tests/playwright/board-config.spec.ts -g "adds the new row to row settings when only a name is provided"
```

Other scopes when useful:

```bash
deno task e2e-test tests/playwright/board-crud.spec.ts                    # whole file
deno task e2e-test tests/playwright/a.spec.ts tests/playwright/b.spec.ts  # several files
deno task e2e-test <file> -g "<title>" --repeat-each=3                    # confirm a fix is stable, not lucky
```

## Step 3 — Debug it

Read the failure output first. Then dig with the retained artifacts:

- **Page snapshot at the moment of failure** — what the DOM actually looked like:
  ```bash
  cat test-results/<test-dir>/error-context.md
  ```
  (A page stuck on `heading "Task dashboard is loading..."` means the React board
  island never mounted — look upstream of the board, not at the assertion.)

- **Network requests** from the trace — spot redirect loops, hung, or unexpected
  external calls. No `unzip` here, so use the bundled helper:
  ```bash
  deno run --allow-read .claude/skills/debug-playwright-failures/trace-net.mjs \
    test-results/<test-dir>/trace.zip
  # add a substring to filter, e.g. ... trace.zip clerk
  ```
  A URL requested ~10× (e.g. `/dashboard` looping) is a redirect/remount loop.

- **Flaky vs. hard failure:** re-run with `--repeat-each=3`. Passes sometimes →
  timing/hydration/handshake issue. Fails every time → deterministic bug.

## Step 4 — Propose the fix, then wait

State the root cause and the exact change — **file, line, and the edit** — in
plain terms. Then ask: *"Want me to implement this fix?"* **Do not edit until the
user approves that specific fix.**

## Step 5 — Apply, re-run, confirm

On approval, make the change, then re-run the same isolated command from Step 2.
Also `--repeat-each=3` if the failure was flaky, to prove stability.

- **Passes** → remove it from the list, go back to Step 2 with the next failure.
- **Still fails** → back to Step 3 (the new output usually reveals more). Repeat
  Step 3→5 until green.

One root cause can fix several listed failures (they may share a fixture or
helper) — after a fix, it's worth running the other same-file/same-fixture
failures to see which already went green.

## Step 6 — Final full-suite run

When the list is empty, run the whole suite once more to confirm nothing
regressed:

```bash
deno task e2e-test 2>&1 | tail -25
```

## Gotchas seen in this repo

- **Guest tests + Clerk handshake.** Guest specs use the `testNoClerk` fixture
  ([tests/playwright/fixtures.ts](tests/playwright/fixtures.ts)). Clerk is a global
  Astro integration, so even a logged-out `/dashboard` boots Clerk's client. If the
  fixture doesn't inject the Clerk **testing token**, a fresh browser context runs
  a real dev-browser handshake (`__clerk_hs_reason=dev-browser-missing`) that
  **redirect-loops `/dashboard`** and remounts the board island — so the
  `html[data-board-loaded='true']` gate never latches and `beforeEach` times out at
  30s. `trace-net.mjs` showing `/dashboard` ~10× + a `clerk.accounts.dev/.../handshake`
  request is the fingerprint. Fix: inject the testing token in the fixture.
- **`data-board-loaded`.** [BoardView.tsx](src/components/BoardView.tsx) sets
  `html[data-board-loaded='true']` only after the island hydrates and `BOARD/LOAD`
  commits. Guest load is synchronous localStorage — if that flag never appears, the
  island isn't mounting, not the board data hanging.
- **`[Clerk Testing] FAPI request failed after N attempts … Test ended`** in output
  is benign teardown-race noise from the authenticated fixture; ignore it if the
  test passed.
- **Never assume a browser locally.** There's no Chromium in this container; tests
  only run via the remote `playwright` service through `deno task e2e-test`.

## The helper

[trace-net.mjs](.claude/skills/debug-playwright-failures/trace-net.mjs) — reads a
Playwright `trace.zip` (via a JSR zip module, since `unzip` is absent) and prints
recorded request URLs grouped by count. That count-by-URL view is what surfaces
redirect loops and stray external calls behind flaky failures.
