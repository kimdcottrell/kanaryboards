// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

// The real @std/http/file-server is a JSR import resolved via Deno's native
// import map — Vite's resolver (which vitest uses) can't see it, so it's
// stubbed out here. Every test supplies its own `serveStatic` anyway.
vi.mock("@std/http/file-server", () => ({ serveDir: vi.fn() }));

const { createRequestHandler } = await import("../../src/server.ts");

function makeStaticResponse(
  status: number,
  init: ResponseInit = {},
): Response {
  return new Response(status === 204 ? null : "body", { status, ...init });
}

describe("createRequestHandler", () => {
  describe("30x responses", () => {
    test("passes through a redirect from the static file server", async () => {
      const serveStatic = vi.fn(() =>
        Promise.resolve(
          makeStaticResponse(301, {
            headers: { location: "/foo/" },
          }),
        )
      );
      const handle = vi.fn();
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(),
        serveStatic,
        handle,
      });

      const res = await handleRequest(
        new Request("http://localhost/foo", { method: "GET" }),
      );

      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe("/foo/");
      expect(handle).not.toHaveBeenCalled();
    });

    test("still applies security headers to a redirect response", async () => {
      const serveStatic = vi.fn(() => Promise.resolve(makeStaticResponse(308)));
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(),
        serveStatic,
        handle: vi.fn(),
      });

      const res = await handleRequest(
        new Request("http://localhost/foo", { method: "GET" }),
      );

      expect(res.status).toBe(308);
      expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    });
  });

  describe("40x responses", () => {
    test("falls through to the SSR handler when no static file matches, returning its 404", async () => {
      const serveStatic = vi.fn(() => Promise.resolve(makeStaticResponse(404)));
      const handle = vi.fn(() =>
        Promise.resolve(new Response("not found", { status: 404 }))
      );
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(),
        serveStatic,
        handle,
      });

      const res = await handleRequest(
        new Request("http://localhost/missing", { method: "GET" }),
      );

      expect(res.status).toBe(404);
      expect(handle).toHaveBeenCalledOnce();
    });

    test("passes through a 403 from the static file server", async () => {
      const serveStatic = vi.fn(() => Promise.resolve(makeStaticResponse(403)));
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(),
        serveStatic,
        handle: vi.fn(),
      });

      const res = await handleRequest(
        new Request("http://localhost/secret", { method: "GET" }),
      );

      expect(res.status).toBe(403);
    });

    test("bypasses the static file server for non-GET/HEAD methods and returns the SSR handler's status", async () => {
      const serveStatic = vi.fn();
      const handle = vi.fn(() =>
        Promise.resolve(new Response("bad request", { status: 400 }))
      );
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(),
        serveStatic,
        handle,
      });

      const res = await handleRequest(
        new Request("http://localhost/api/board", { method: "POST" }),
      );

      expect(res.status).toBe(400);
      expect(serveStatic).not.toHaveBeenCalled();
    });
  });

  describe("50x responses", () => {
    test("passes through a 500 from the SSR handler", async () => {
      const serveStatic = vi.fn(() => Promise.resolve(makeStaticResponse(404)));
      const handle = vi.fn(() =>
        Promise.resolve(new Response("server error", { status: 500 }))
      );
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(),
        serveStatic,
        handle,
      });

      const res = await handleRequest(
        new Request("http://localhost/board", { method: "GET" }),
      );

      expect(res.status).toBe(500);
    });

    test("passes through a 503 from the SSR handler for a POST request", async () => {
      const handle = vi.fn(() =>
        Promise.resolve(new Response("unavailable", { status: 503 }))
      );
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(),
        serveStatic: vi.fn(),
        handle,
      });

      const res = await handleRequest(
        new Request("http://localhost/api/generate-tasks", {
          method: "POST",
        }),
      );

      expect(res.status).toBe(503);
    });
  });

  describe("Cache-Control for prerendered routes", () => {
    test("sets Cache-Control on a 200 for a known prerendered path", async () => {
      const serveStatic = vi.fn(() => Promise.resolve(makeStaticResponse(200)));
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(["privacy"]),
        serveStatic,
        handle: vi.fn(),
      });

      const res = await handleRequest(
        new Request("http://localhost/privacy", { method: "GET" }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe(
        "public, s-maxage=300, stale-while-revalidate=600",
      );
    });

    test("does not set Cache-Control for a path outside the prerendered set", async () => {
      const serveStatic = vi.fn(() => Promise.resolve(makeStaticResponse(200)));
      const handleRequest = createRequestHandler({
        prerenderedPaths: new Set(["privacy"]),
        serveStatic,
        handle: vi.fn(),
      });

      const res = await handleRequest(
        new Request("http://localhost/some-asset.js", { method: "GET" }),
      );

      expect(res.headers.get("Cache-Control")).toBeNull();
    });
  });
});
