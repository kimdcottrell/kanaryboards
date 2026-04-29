---
name: Playwright test setup
description: Playwright config, test file locations, dev server access, and MCP browser quirks for this project
type: project
---

Config is at `/var/dev/playwright.config.ts`. Tests live in `/var/dev/tests/`. Run with `npx playwright test` (Playwright is not in package.json yet — install separately).

Dev server: `deno task dev` on port 4321. The Playwright MCP browser cannot reach `localhost:4321` — use `172.19.0.3:4321` (the Docker network IP shown in `deno task dev` output) instead.

**MCP browser quirk:** every `browser_click` call throws `EACCES: permission denied, mkdir '/var/dev'` (the MCP server can't write its screenshot dir). The click still executes — verify success via `browser_snapshot` immediately after.

**Standard `beforeEach`:**
```ts
await page.addInitScript(() => localStorage.clear());
await page.goto("/");
```
This clears localStorage before the React app initialises, giving a predictable initial state (one "Sample Project" row, columns: To Do / In Progress / Done).

**Opening the task create modal:**
```ts
await page.evaluate(() => {
  (document.querySelector("button:has(.hugeicons--credit-card-add)") as HTMLButtonElement)?.click();
});
await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();
```
Direct `browser_click` with `button:has(.hugeicons--credit-card-add)` hits strict-mode violations (3 buttons match). Use `evaluate` with `[0]` indexing or scope to a column locator.
