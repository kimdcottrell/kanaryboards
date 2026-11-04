/// <reference lib="dom" />
import type { Page } from "@playwright/test";
import {
  expect,
  gotoAndWaitForClerk,
  testAuthed as test,
} from "../fixtures.ts";

// A "malicious user" suite for /api/v1/board. There's no SQL here — Deno KV is a
// key-value store keyed by ["row" | "column" | "task", boardId, id], not a
// query engine — so there's no query-injection surface to test. What matters
// instead:
//
// 1. boardId is derived server-side from the Clerk session in
//    protectedRequestMiddleware (middleware.ts), never from client input, so a
//    spoofed "boardId" cookie can't redirect an authenticated user's reads or
//    writes at another board.
// 2. PATCH /api/v1/board validates the body against a zod schema (board.ts)
//    before it ever reaches applyBoardChanges, so malformed or oversized
//    bodies fail cleanly with a 400 instead of crashing with an unhandled 500
//    or silently writing garbage to the board.
//
// Runs against the shared E2E Clerk test account's real board in KV — like
// board-persistence.spec.ts, this is chromium-only (a single shared account
// can't run concurrently across browser projects) and the board is wiped via
// /api/v1/test-data before and after every test. Lives under
// preview-only/ per policy: no spec that fires attack-shaped payloads at a
// live server should be reachable via `deno task e2e-test`, whose BASE_URL
// can point at a real deployed environment.

const noDeletes = { rowIds: [], columnIds: [], taskIds: [] };
const upserts = (changes: Record<string, unknown[]>) => ({
  upserts: { rows: [], columns: [], tasks: [], ...changes },
  deletes: noDeletes,
});

async function seedBoard(page: Page, title: string) {
  const res = await page.request.patch("/api/v1/board", {
    data: upserts({
      rows: [{ id: "row-1", title, color: "blue", order: "a0" }],
    }),
  });
  expect(res.status()).toBe(200);
}

test.describe("/api/v1/board — malicious input safety", () => {
  // Every test in this file mutates the same shared E2E Clerk account's
  // board, so they must not interleave (Playwright otherwise runs tests
  // within a file across parallel workers by default).
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "shares one Clerk test account across runs",
    );
    // testAuthed boots with global.setup.ts's storage state, so the session is
    // already live — no clerk.signIn() round-trip needed here. Deliberately
    // NOT /dashboard: that mounts the board island, whose debounced autosave
    // then races seedBoard() and can overwrite it with the empty loaded board.
    // /blog boots Clerk (refreshing __session) with no island at all.
    await gotoAndWaitForClerk(page, "/blog");
    const cleanup = await page.request.delete("/api/v1/test-data");
    expect(cleanup.status()).toBe(200);
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete("/api/v1/test-data");
  });

  test("a spoofed boardId cookie cannot redirect a read to another board", async ({ page, context, baseURL }) => {
    const marker = `E2E marker ${crypto.randomUUID()}`;
    await seedBoard(page, marker);

    await context.addCookies([
      { name: "boardId", value: "attacker-controlled-board-id", url: baseURL! },
    ]);

    const get = await page.request.get("/api/v1/board");
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
    const get = await page.request.get("/api/v1/board");
    const body = await get.json();
    expect(body.rows[0].title).toBe(marker);
  });

  test.describe("PATCH payload validation", () => {
    const MALFORMED_CASES: [string, unknown][] = [
      [
        "upserts.rows is a string instead of an array",
        {
          upserts: { rows: "not-an-array", columns: [], tasks: [] },
          deletes: noDeletes,
        },
      ],
      ["empty object", {}],
      ["deletes is missing", { upserts: { rows: [], columns: [], tasks: [] } }],
      ["a whole board instead of changes", {
        rows: [],
        columns: [],
        tasks: [],
      }],
      ["unrelated shape entirely", { foo: "bar" }],
      [
        "a column missing required fields",
        upserts({ columns: [{ id: "c1", title: "x" }] }),
      ],
      [
        "more than 1000 changes",
        {
          upserts: { rows: [], columns: [], tasks: [] },
          deletes: {
            ...noDeletes,
            taskIds: Array.from({ length: 1001 }, (_, i) => `t${i}`),
          },
        },
      ],
    ];

    for (const [label, data] of MALFORMED_CASES) {
      test(`rejected with 400, board left untouched — ${label}`, async ({ page }) => {
        const marker = `E2E marker ${crypto.randomUUID()}`;
        await seedBoard(page, marker);

        const res = await page.request.patch("/api/v1/board", { data });
        expect(res.status()).toBe(400);
        expect(await res.json()).toEqual({ error: "Invalid request body." });

        const get = await page.request.get("/api/v1/board");
        const body = await get.json();
        expect(body.rows[0].title).toBe(marker);
      });
    }

    test("an entity over Deno KV's 64KiB value limit is rejected with 400, not a 500", async ({ page }) => {
      const marker = `E2E marker ${crypto.randomUUID()}`;
      await seedBoard(page, marker);

      const oversized = upserts({
        tasks: [{
          id: "task-1",
          rowId: "row-1",
          colId: "col-1",
          title: "a".repeat(200_000),
          description: "",
          checklist: [],
          order: "a0",
          trashedAt: null,
          preTrashColId: null,
        }],
      });
      const res = await page.request.patch("/api/v1/board", {
        data: oversized,
      });
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid request body." });

      const get = await page.request.get("/api/v1/board");
      const body = await get.json();
      expect(body.rows[0].title).toBe(marker);
      expect(body.tasks).toEqual([]);
    });
  });

  test("PATCHes touching different tasks both persist", async ({ page }) => {
    const task = (id: string, title: string) => ({
      id,
      rowId: "row-1",
      colId: "col-1",
      title,
      description: "",
      checklist: [],
      order: "a0",
      trashedAt: null,
      preTrashColId: null,
    });
    await seedBoard(page, `E2E marker ${crypto.randomUUID()}`);
    for (const [id, title] of [["task-1", "one"], ["task-2", "two"]]) {
      const res = await page.request.patch("/api/v1/board", {
        data: upserts({ tasks: [task(id, title)] }),
      });
      expect(res.status()).toBe(200);
    }

    const get = await page.request.get("/api/v1/board");
    const body = await get.json();
    expect(body.tasks.map((t: { title: string }) => t.title).sort()).toEqual([
      "one",
      "two",
    ]);
  });
});
