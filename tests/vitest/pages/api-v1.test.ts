// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";
import { _setKvForTest, applyBoardChanges, getBoard } from "@lib/db/kv.ts";

const paid = vi.hoisted(() => ({ value: true }));
vi.mock("@lib/api/billing.ts", () => ({
  isPaidUser: vi.fn(() => Promise.resolve(paid.value)),
}));

const rows = await import("@pages/api/v1/rows/index.ts");
const row = await import("@pages/api/v1/rows/[id].ts");
const tasks = await import("@pages/api/v1/tasks/index.ts");
const task = await import("@pages/api/v1/tasks/[id].ts");
const columns = await import("@pages/api/v1/columns.ts");
const validate = await import("@pages/api/v1/validate/[entity]/[field].ts");

let memKv: Deno.Kv;
beforeEach(async () => {
  memKv = await Deno.openKv(":memory:");
  _setKvForTest(memKv);
  paid.value = true;
});
afterEach(() => memKv.close());

const auth = vi.fn((_opts?: { acceptsToken?: string }) => ({
  userId: "user_cli" as string | null,
}));

function ctx(
  { method = "GET", path = "/", params = {}, body, headers = {}, userId }: {
    method?: string;
    path?: string;
    params?: Record<string, string>;
    body?: unknown;
    headers?: Record<string, string>;
    userId?: string | null;
  } = {},
): APIContext {
  auth.mockReturnValue({ userId: userId === undefined ? "user_cli" : userId });
  const url = new URL(`http://localhost/api/v1${path}`);
  return {
    url,
    params,
    request: new Request(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    locals: { auth },
  } as unknown as APIContext;
}

// Creates a row (and so the default columns) and a task in its To Do column.
async function seed() {
  const created = await (await rows.POST(
    ctx({ method: "POST", body: { title: "Project" } }),
  )).json();
  const cols = await (await columns.GET(ctx())).json();
  const res = await tasks.POST(ctx({
    method: "POST",
    body: {
      rowId: created.id,
      colId: cols[0].id,
      title: "Write CLI",
      description: "Line one\nLine two",
      checklist: ["Parse args"],
    },
  }));
  return { row: created, cols, task: await res.json(), status: res.status };
}

describe("auth gate", () => {
  test("verifies the request as a Clerk OAuth token", async () => {
    await rows.GET(ctx());
    expect(auth).toHaveBeenCalledWith({ acceptsToken: "oauth_token" });
  });

  test("401 without a valid token", async () => {
    const res = await rows.GET(ctx({ userId: null }));
    expect(res.status).toBe(401);
  });

  test("402 for a user without a paid plan", async () => {
    paid.value = false;
    const res = await tasks.GET(ctx());
    expect(res.status).toBe(402);
  });
});

describe("validate", () => {
  const check = (entity: string, field: string, value: unknown) =>
    validate.POST(ctx({
      method: "POST",
      params: { entity, field },
      body: { value },
    }));

  test("an empty title is rejected", async () => {
    const res = await check("task", "title", "   ");
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Title is required." });
  });

  test("a title is trimmed and its newlines become spaces", async () => {
    const res = await check("task", "title", "  Ship\nit ");
    expect(await res.json()).toEqual({ ok: true, value: "Ship it" });
  });

  test("a row color can be given by label", async () => {
    const res = await check("row", "color", "green");
    expect(await res.json()).toEqual({
      ok: true,
      value: "var(--color-row-green)",
    });
  });

  test("the Trash column and unknown rows are rejected", async () => {
    await seed();
    const trash = (await getBoard(
      (await memKv.get<string>(["user_board", "user_cli"])).value!,
    ))!.columns.find((c) => c.isTrash)!;
    expect((await check("task", "colId", trash.id)).status).toBe(422);
    expect((await check("task", "rowId", "nope")).status).toBe(422);
  });

  test("unknown fields (including prototype keys) are 404", async () => {
    expect((await check("task", "constructor", "x")).status).toBe(404);
    expect((await check("board", "title", "x")).status).toBe(404);
  });
});

describe("rows", () => {
  test("the first row also creates the default columns", async () => {
    const { row: created } = await seed();
    expect(created).toMatchObject({ title: "Project", color: "Blue" });
    const cols = await (await columns.GET(ctx())).json();
    expect(cols.map((c: { title: string }) => c.title)).toEqual([
      "To Do",
      "In Progress",
      "Review",
      "Done",
    ]);
    const list = await (await rows.GET(ctx())).json();
    expect(list).toMatchObject([{ title: "Project", taskCount: 1 }]);
  });

  test("an empty title is rejected", async () => {
    const res = await rows.POST(ctx({ method: "POST", body: { title: "" } }));
    expect(res.status).toBe(422);
  });

  test("edit by short id with If-Match", async () => {
    const { row: created } = await seed();
    const got = await row.GET(ctx({ params: { id: created.shortId } }));
    const res = await row.PATCH(ctx({
      method: "PATCH",
      params: { id: created.shortId },
      headers: { "If-Match": got.headers.get("ETag")! },
      body: { title: "Renamed", color: "Red" },
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ title: "Renamed", color: "Red" });
  });
});

describe("tasks", () => {
  test("create stores Lexical description and checklist", async () => {
    const { task: created, status } = await seed();
    expect(status).toBe(201);
    expect(created).toMatchObject({
      title: "Write CLI",
      description: "Line one\nLine two",
      rowTitle: "Project",
      colTitle: "To Do",
    });
    expect(created.checklist.map((i: { text: string }) => i.text)).toEqual([
      "Parse args",
    ]);
    expect(created.shortId).toBe(created.id.slice(-8));
  });

  test("create requires a title", async () => {
    const { row: r, cols } = await seed();
    const res = await tasks.POST(ctx({
      method: "POST",
      body: { rowId: r.id, colId: cols[0].id },
    }));
    expect(res.status).toBe(422);
  });

  test("list filters by row", async () => {
    const { row: r } = await seed();
    const all = await (await tasks.GET(ctx())).json();
    const none = await (await tasks.GET(ctx({ path: "/tasks?rowId=other" })))
      .json();
    const mine = await (await tasks.GET(ctx({ path: `/tasks?rowId=${r.id}` })))
      .json();
    expect(all).toHaveLength(1);
    expect(none).toHaveLength(0);
    expect(mine).toHaveLength(1);
  });

  test("edit requires If-Match, and rejects a stale one", async () => {
    const { task: created } = await seed();
    const params = { id: created.shortId };
    const got = await task.GET(ctx({ params }));
    const etag = got.headers.get("ETag")!;

    const noHeader = await task.PATCH(
      ctx({ method: "PATCH", params, body: { title: "x" } }),
    );
    expect(noHeader.status).toBe(428);

    const ok = await task.PATCH(ctx({
      method: "PATCH",
      params,
      headers: { "If-Match": etag },
      body: { title: "Renamed", checklist: ["Add tests"] },
    }));
    expect(ok.status).toBe(200);
    const edited = await ok.json();
    expect(edited.title).toBe("Renamed");
    expect(edited.description).toBe("Line one\nLine two");
    expect(edited.checklist.map((i: { text: string }) => i.text)).toEqual([
      "Parse args",
      "Add tests",
    ]);

    const stale = await task.PATCH(ctx({
      method: "PATCH",
      params,
      headers: { "If-Match": etag },
      body: { title: "Lost update" },
    }));
    expect(stale.status).toBe(409);
  });

  test("a trashed task can't be edited", async () => {
    const { task: created } = await seed();
    const boardId = (await memKv.get<string>(["user_board", "user_cli"]))
      .value!;
    const board = (await getBoard(boardId))!;
    const trash = board.columns.find((c) => c.isTrash)!;
    const stored = board.tasks[0];
    await applyBoardChanges(boardId, {
      upserts: {
        rows: [],
        columns: [],
        tasks: [{
          ...stored,
          colId: trash.id,
          trashedAt: new Date().toISOString(),
          preTrashColId: stored.colId,
        }],
      },
      deletes: { rowIds: [], columnIds: [], taskIds: [] },
    });
    const params = { id: created.shortId };
    const got = await task.GET(ctx({ params }));
    const res = await task.PATCH(ctx({
      method: "PATCH",
      params,
      headers: { "If-Match": got.headers.get("ETag")! },
      body: { title: "x" },
    }));
    expect(res.status).toBe(409);
    expect(await (await tasks.GET(ctx())).json()).toEqual([]);
  });

  test("an unknown id is 404", async () => {
    await seed();
    const res = await task.GET(ctx({ params: { id: "ffffffff" } }));
    expect(res.status).toBe(404);
  });
});
