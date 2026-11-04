// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";

// Avoid touching Deno KV — these tests only exercise the auth gate.
vi.mock("@lib/db/kv.ts", () => ({
  getBoard: vi.fn(async () => {}),
  applyBoardChanges: vi.fn(async () => {}),
  deleteBoard: vi.fn(async () => {}),
  deleteBoardComments: vi.fn(async () => {}),
}));

const { GET, PATCH, DELETE } = await import("@pages/api/v1/board.ts");

function makeContext(
  { userId, boardId, method = "GET", navigate = false, body }: {
    userId: string | null;
    boardId?: string;
    method?: string;
    navigate?: boolean;
    body?: string;
  },
): APIContext {
  const headers = new Headers();
  if (navigate) headers.set("Sec-Fetch-Mode", "navigate");
  return {
    request: new Request("http://localhost/api/v1/board", {
      method,
      headers,
      body,
    }),
    locals: {
      auth: () => ({ userId }),
      boardId,
    },
  } as unknown as APIContext;
}

describe("/api/v1/board auth gate", () => {
  const handlers = { GET, PATCH, DELETE };

  describe("when unauthenticated", () => {
    test.each(["GET", "PATCH", "DELETE"] as const)(
      "%s from a programmatic fetch returns 401",
      async (method) => {
        const res = await handlers[method](
          makeContext({ userId: null, method }),
        );
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: "Unauthorized" });
      },
    );

    test("a top-level browser navigation is redirected to the dashboard", async () => {
      const res = await GET(
        makeContext({ userId: null, method: "GET", navigate: true }),
      );
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/dashboard?unauthorized=1");
      expect(res.headers.get("x-authenticated")).toBe("false");
    });
  });

  describe("when authenticated", () => {
    test("passes the gate (GET with no stored board yields 404)", async () => {
      const res = await GET(
        makeContext({ userId: "user_123", boardId: "board_1" }),
      );
      expect(res.status).toBe(404);
    });

    const noDeletes = { rowIds: [], columnIds: [], taskIds: [] };
    const patch = (body: unknown) =>
      PATCH(makeContext({
        userId: "user_123",
        boardId: "board_1",
        method: "PATCH",
        body: JSON.stringify(body),
      }));

    test("PATCH with an invalid entity logs the zod issues and returns 400", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await patch({
        upserts: {
          rows: [],
          columns: [{ id: "col-1", title: "To Do", order: "a0" }],
          tasks: [],
        },
        deletes: noDeletes,
      });
      expect(res.status).toBe(400);
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        event: "Rejected PATCH /api/v1/board: invalid request body",
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["upserts", "columns", 0, "pinnedToShortcut"],
          }),
        ]),
      }));
      errorSpy.mockRestore();
    });

    test("PATCH with an entity over the KV value limit returns 400", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await patch({
        upserts: {
          rows: [{
            id: "r",
            title: "a".repeat(70_000),
            color: "",
            order: "a0",
          }],
          columns: [],
          tasks: [],
        },
        deletes: noDeletes,
      });
      expect(res.status).toBe(400);
      errorSpy.mockRestore();
    });

    test("PATCH with more than 1000 changes returns 400", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await patch({
        upserts: { rows: [], columns: [], tasks: [] },
        deletes: {
          ...noDeletes,
          taskIds: Array.from({ length: 1001 }, (_, i) => `t${i}`),
        },
      });
      expect(res.status).toBe(400);
      errorSpy.mockRestore();
    });

    test("PATCH with valid changes returns 200", async () => {
      vi.spyOn(console, "debug").mockImplementation(() => {});
      const res = await patch({
        upserts: {
          rows: [{ id: "r", title: "Project", color: "", order: "a0" }],
          columns: [],
          tasks: [],
        },
        deletes: { ...noDeletes, taskIds: ["t1"] },
      });
      expect(res.status).toBe(200);
    });
  });
});
