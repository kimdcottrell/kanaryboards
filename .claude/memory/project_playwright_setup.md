---
name: Playwright test setup
description: Playwright Docker architecture, trigger mechanism, test file locations, pre-commit hook, and CI workflow
type: project
---

## Architecture

Playwright runs in a dedicated `playwright` Docker service (`images/playwright.Dockerfile`, `node:25-trixie` — official image is buggy). The container runs a lightweight HTTP trigger server (`images/playwright-trigger.js`) on port 3000. Tests are triggered from the `app` container via `deno task e2e-test`, which calls `curl http://playwright:3000/run`.

The entrypoint (`images/playwright-entrypoint.sh`) resolves the Traefik IP at startup and writes `<IP> kanary.local.dev` to `/etc/hosts` using `gosu` to drop back from root to node after.

## Running tests

```bash
deno task e2e-test
```

This auto-starts `deno task dev` if the dev server isn't running, waits for port 4321, fires the trigger, then kills the dev server if it started it.

Config: `playwright.config.ts`. Base URL: `https://kanary.local.dev`. HTTPS errors ignored (self-signed cert). Runs Chromium + Firefox + WebKit.

Tests live in `/var/dev/tests/`:
- `collapse.ts` — collapse/expand behaviour
- `board-config-create-new-row.ts` — board config create-row flow
- `____collapse.ts` — draft/WIP collapse tests (leading `____` deprioritizes ordering)
- `example.spec.ts` — smoke test

## Pre-commit enforcement

`.husky/pre-commit` runs on every commit:
```
deno fmt
deno lint
deno task e2e-test
```
Installed via `npm run prepare` (husky). The full E2E suite must pass before a commit is accepted. **Why npm and not deno for husky:** `package.json` is required for husky; `npm install` (not `npm ci`) is used.

## Standard test patterns

**beforeEach:**
```ts
await page.addInitScript(() => localStorage.clear());
await page.goto("/");
```
Clears localStorage before React initializes → predictable state (one "Sample Project" row, columns: To Do / In Progress / Done).

**Opening task create modal:**
```ts
await page.evaluate(() => {
  (document.querySelector("button:has(.hugeicons--credit-card-add)") as HTMLButtonElement)?.click();
});
await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();
```
Direct click hits strict-mode violations (3 buttons match). Use `evaluate` or scope to a column locator.

**MCP browser quirk (mcp_playwright service):** `browser_click` throws `EACCES: permission denied, mkdir '/var/dev'` but the click executes — verify with `browser_snapshot`.

## CI

- `auto-create-pr.yml`: auto-creates PR on push to `feature/**` / `bugfix/**` (idempotent).
- `e2e.yml`: on every PR, polls GitHub Statuses API for Deno Deploy success, then polls Deno Deploy API for preview domain, then runs `npx playwright test` against it. Uploads `playwright-report` artifact (30-day retention).

**Why:** E2E tests run against the real Deno Deploy preview, not localhost, so the CI workflow must wait for both the deploy status and the preview domain to be live before running.
