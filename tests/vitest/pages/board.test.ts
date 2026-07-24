// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";

// Avoid touching Deno KV — these tests only exercise the auth gate.
vi.mock("@lib/db/kv.ts", () => ({
  getBoard: vi.fn(async () => null),
  saveBoard: vi.fn(async () => {}),
  deleteBoard: vi.fn(async () => {}),
}));

const { GET, PUT, DELETE } = await import("@pages/api/board.ts");

function makeContext(
  { userId, boardId, method = "GET", navigate = false }: {
    userId: string | null;
    boardId?: string;
    method?: string;
    navigate?: boolean;
  },
): APIContext {
  const headers = new Headers();
  if (navigate) headers.set("Sec-Fetch-Mode", "navigate");
  return {
    request: new Request("http://localhost/api/board", { method, headers }),
    locals: {
      auth: () => ({ userId }),
      boardId,
    },
  } as unknown as APIContext;
}

describe("/api/board auth gate", () => {
  const handlers = { GET, PUT, DELETE };

  describe("when unauthenticated", () => {
    test.each(["GET", "PUT", "DELETE"] as const)(
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
  });
});
