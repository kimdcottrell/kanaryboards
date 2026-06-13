// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";

// Controls what the mocked Clerk `auth()` callback reports for each test.
const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  userId: null as string | null,
}));

// Replace clerkMiddleware with a pass-through that invokes the handler with a
// controllable `auth` callback, while keeping the real createRouteMatcher so the
// actual /api/board route-matching logic is exercised.
vi.mock("@clerk/astro/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/astro/server")>();
  return {
    ...actual,
    // deno-lint-ignore no-explicit-any
    clerkMiddleware: (handler: any) => (context: any, next: any) =>
      handler(() => ({ ...authState }), context, next),
  };
});

// Avoid touching Deno KV — the authenticated path looks up a board id.
vi.mock("@lib/kv.ts", () => ({
  getBoardIdForUser: vi.fn(() => "existing-board"),
  setBoardIdForUser: vi.fn(async () => {}),
}));

const { protectedRequestMiddleware } = await import("../../src/middleware.ts");

function makeContext(url: string, method = "GET"): APIContext {
  const request = new Request(url, { method });
  return {
    request,
    url: new URL(url),
    clientAddress: "127.0.0.1",
    locals: {},
    cookies: { get: () => undefined, set: () => {} },
  } as unknown as APIContext;
}

describe("protectedRequestMiddleware", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.userId = null;
  });

  describe("when unauthenticated", () => {
    // board.ts exposes GET, PUT and DELETE — every method must be blocked.
    test.each(["GET", "PUT", "DELETE"])(
      "blocks %s /api/board with a 302 redirect to the homepage",
      async (method) => {
        const next = vi.fn();
        const res = await protectedRequestMiddleware(
          makeContext("http://localhost/api/board", method),
          next,
        ) as Response;

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/?unauthorized=1");
        expect(res.headers.get("x-authenticated")).toBe("false");
        expect(next).not.toHaveBeenCalled();
      },
    );

    test("blocks nested /api/board/* routes", async () => {
      const next = vi.fn();
      const res = await protectedRequestMiddleware(
        makeContext("http://localhost/api/board/abc123", "GET"),
        next,
      ) as Response;

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/?unauthorized=1");
      expect(next).not.toHaveBeenCalled();
    });

    test("lets non-protected routes through to the next middleware", async () => {
      const next = vi.fn(() => Promise.resolve(new Response("ok")));
      await protectedRequestMiddleware(makeContext("http://localhost/"), next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe("when authenticated", () => {
    beforeEach(() => {
      authState.isAuthenticated = true;
      authState.userId = "user_123";
    });

    test("allows /api/board and assigns the user's boardId", async () => {
      const next = vi.fn(() => Promise.resolve(new Response("ok")));
      const context = makeContext("http://localhost/api/board", "PUT");
      await protectedRequestMiddleware(context, next);

      expect(next).toHaveBeenCalledOnce();
      expect(context.locals.boardId).toBe("existing-board");
    });
  });
});
