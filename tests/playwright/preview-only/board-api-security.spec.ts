/// <reference lib="dom" />
import { clerk } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";
import { expect, testNoClerk as test } from "../fixtures.ts";

// A "malicious user" suite for /api/board. There's no SQL here — Deno KV is a
// key-value store keyed by ["board", boardId], not a query engine — so there's
// no query-injection surface to test. What matters instead:
//
// 1. boardId is derived server-side from the Clerk session in
//    protectedRequestMiddleware (middleware.ts), never from client input, so a
//    spoofed "boardId" cookie can't redirect an authenticated user's reads or
//    writes at another board.
// 2. PUT /api/board validates the body against a zod schema (board.ts) before
//    it ever reaches saveBoard, so malformed or oversized bodies fail cleanly
//    with a 400 instead of crashing with an unhandled 500 or silently
//    overwriting the board with garbage.
//
// Runs against the shared E2E Clerk test account's real board in KV — like
// board-persistence.spec.ts, this is chromium-only (a single shared account
// can't run concurrently across browser projects) and the board is wiped via
// /api/delete-test-data before and after every test. Lives under
// preview-only/ per policy: no spec that fires attack-shaped payloads at a
// live server should be reachable via `deno task e2e-test`, whose BASE_URL
// can point at a real deployed environment.

const E2E_EMAIL = process.env.E2E_CLERK_USER_EMAIL ?? "";

async function seedBoard(page: Page, title: string) {
  const res = await page.request.put("/api/board", {
    data: {
      rows: [{ id: "row-1", title, color: "blue", order: "a0" }],
      columns: [],
      tasks: [],
    },
  });
  expect(res.status()).toBe(200);
}

test.describe("/api/board — malicious input safety", () => {
  // Every test in this file mutates the same shared E2E Clerk account's
  // board, so they must not interleave (Playwright otherwise runs tests
  // within a file across parallel workers by default).
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "shares one Clerk test account across runs",
    );
    await page.goto("/dashboard");
    await clerk.signIn({ page, emailAddress: E2E_EMAIL });
    // Reload so the server recomputes isAuthenticated (see global.setup.ts) —
    // without this wait, page.request calls below can race the server's auth
    // cookie propagation and hit /api/board before locals.boardId is set.
    await page.goto("/dashboard");
    await page.locator("html[data-board-loaded='true']").waitFor({
      state: "attached",
    });
    const cleanup = await page.request.get("/api/delete-test-data");
    expect(cleanup.status()).toBe(200);
  });

  test.afterEach(async ({ page }) => {
    await page.request.get("/api/delete-test-data");
  });

  test("a spoofed boardId cookie cannot redirect a read to another board", async ({ page, context, baseURL }) => {
    const marker = `E2E marker ${crypto.randomUUID()}`;
    await seedBoard(page, marker);

    await context.addCookies([
      { name: "boardId", value: "attacker-controlled-board-id", url: baseURL! },
    ]);

    const get = await page.request.get("/api/board");
    expect(get.status()).toBe(200);
    const body = await get.json();
    expect(body.rows[0].title).toBe(marker);
  });

  test("a spoofed boardId cookie cannot redirect a write to another board", async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: "boardId", value: "attacker-controlled-board-id", url: baseURL! },
    ]);

    const marker = `E2E marker ${crypto.randomUUID()}`;
    await seedBoard(page, marker);

    // Read back without the spoofed cookie — the write must have landed on
    // this user's real board, not "attacker-controlled-board-id".
    await context.clearCookies({ name: "boardId" });
    const get = await page.request.get("/api/board");
    const body = await get.json();
    expect(body.rows[0].title).toBe(marker);
  });

  test.describe("PUT payload validation", () => {
    const MALFORMED_CASES: [string, unknown][] = [
      [
        "rows is a string instead of an array",
        { rows: "not-an-array", columns: [], tasks: [] },
      ],
      ["empty object", {}],
      ["rows is null", { rows: null, columns: [], tasks: [] }],
      ["unrelated shape entirely", { foo: "bar" }],
      [
        "a column missing required fields",
        { rows: [], columns: [{ id: "c1", title: "x" }], tasks: [] },
      ],
    ];

    for (const [label, data] of MALFORMED_CASES) {
      test(`rejected with 400, board left untouched — ${label}`, async ({ page }) => {
        const marker = `E2E marker ${crypto.randomUUID()}`;
        await seedBoard(page, marker);

        const res = await page.request.put("/api/board", { data });
        expect(res.status()).toBe(400);
        expect(await res.json()).toEqual({ error: "Invalid request body." });

        const get = await page.request.get("/api/board");
        const body = await get.json();
        expect(body.rows[0].title).toBe(marker);
      });
    }

    test("a payload over Deno KV's 64KiB value limit is rejected with 400, not a 500", async ({ page }) => {
      const marker = `E2E marker ${crypto.randomUUID()}`;
      await seedBoard(page, marker);

      const oversized = {
        rows: [],
        columns: [],
        tasks: [{
          id: "task-1",
          rowId: "row-1",
          colId: "col-1",
          title: "a".repeat(200_000),
          description: "",
          checklist: [],
          order: "a0",
        }],
      };
      const res = await page.request.put("/api/board", { data: oversized });
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid request body." });

      const get = await page.request.get("/api/board");
      const body = await get.json();
      expect(body.rows[0].title).toBe(marker);
    });
  });
});
