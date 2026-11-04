// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";
import { z } from "astro/zod";
import {
  cliRoute,
  HttpError,
  publicRoute,
  sessionRoute,
} from "@lib/api/route.ts";
import type { Caller } from "@lib/api/route.ts";
import { parseBody, readJsonObject } from "@lib/api/request.ts";

vi.mock("@lib/api/cli-auth.ts", () => ({
  authorizeCli: vi.fn(() => ({ userId: "user_cli", boardId: "board_cli" })),
}));

afterEach(() => vi.restoreAllMocks());

// `boardId: null` leaves locals.boardId unset.
function ctx(
  { userId = "user_1", boardId = "board_1", navigate = false, method = "GET" }:
    {
      userId?: string | null;
      boardId?: string | null;
      navigate?: boolean;
      method?: string;
    } = {},
): APIContext {
  const headers = new Headers();
  if (navigate) headers.set("Sec-Fetch-Mode", "navigate");
  return {
    request: new Request("http://localhost/api/v1/thing", { method, headers }),
    locals: { auth: () => ({ userId }), boardId: boardId ?? undefined },
  } as unknown as APIContext;
}

const ok = () => new Response("ok");
// A handler mock typed like the real ones, so its calls can be inspected.
const mockHandler = () =>
  vi.fn((_context: APIContext, _caller: Caller) => ok());

describe("sessionRoute", () => {
  test("passes the caller's userId and boardId to the handler", async () => {
    const handler = mockHandler();
    await sessionRoute(handler)(ctx());
    expect(handler.mock.calls[0][1]).toEqual({
      userId: "user_1",
      boardId: "board_1",
    });
  });

  test("401 JSON for a signed-out fetch, without calling the handler", async () => {
    const handler = mockHandler();
    const res = await sessionRoute(handler)(ctx({ userId: null }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(handler).not.toHaveBeenCalled();
  });

  test("302 to the dashboard for a signed-out browser navigation", async () => {
    const res = await sessionRoute(ok)(ctx({ userId: null, navigate: true }));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/dashboard?unauthorized=1");
  });

  test("401 and a logged bug when the session has no boardId", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await sessionRoute(ok)(
      ctx({ boardId: null, method: "PATCH" }),
    );
    expect(res.status).toBe(401);
    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
      event:
        "Rejected PATCH /api/v1/thing: locals.boardId missing despite passing the auth gate",
    }));
  });
});

describe("cliRoute", () => {
  test("authenticates with authorizeCli", async () => {
    const handler = mockHandler();
    await cliRoute(handler)(ctx());
    expect(handler.mock.calls[0][1]).toEqual({
      userId: "user_cli",
      boardId: "board_cli",
    });
  });
});

describe("HttpError", () => {
  test("a string body is sent as {error}", async () => {
    const res = await publicRoute(() => {
      throw new HttpError(422, "Title is required.");
    })(ctx());
    expect(res.status).toBe(422);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await res.json()).toEqual({ error: "Title is required." });
  });

  test("an object body is sent as is", async () => {
    const res = await publicRoute(() => {
      throw new HttpError(404, { noData: true });
    })(ctx());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ noData: true });
  });

  test("any other error is rethrown (Astro's 500)", async () => {
    const route = publicRoute(() => {
      throw new TypeError("boom");
    });
    await expect(route(ctx())).rejects.toThrow("boom");
  });
});

describe("parseBody", () => {
  const schema = z.object({ title: z.string() });
  const request = (body: string) =>
    new Request("http://localhost/api/v1/thing", { method: "POST", body });

  test("returns the parsed body", async () => {
    expect(await parseBody(request('{"title":"x"}'), schema)).toEqual({
      title: "x",
    });
  });

  test("a body that fails the schema is logged and a 400", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = await parseBody(request('{"title":1}'), schema, {
      boardId: "b1",
    }).catch((e) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 400,
      body: "Invalid request body.",
    });
    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: "Rejected POST /api/v1/thing: invalid request body",
      boardId: "b1",
      issues: [expect.objectContaining({ path: ["title"] })],
    }));
  });

  test("a body that isn't JSON is logged and a 400", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(parseBody(request("{"), schema)).rejects.toMatchObject({
      status: 400,
    });
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});

describe("readJsonObject", () => {
  test.each(["[]", "null", '"text"', "{"])(
    "rejects %s with a 400",
    async (body) => {
      await expect(
        readJsonObject(
          new Request("http://localhost", { method: "POST", body }),
        ),
      ).rejects.toMatchObject({ status: 400, body: "Invalid request body." });
    },
  );
});
