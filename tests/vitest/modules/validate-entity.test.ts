import { afterEach, describe, expect, test, vi } from "vitest";
import { validateEntity } from "@components/react/context/actions/shared.ts";

const respond = (status: number, body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(body), { status }))
    ),
  );

afterEach(() => vi.unstubAllGlobals());

describe("validateEntity", () => {
  test("posts the values to /api/v1/validate/{entity} as the app", async () => {
    respond(200, { ok: true, values: { title: "Q3" } });
    await validateEntity("row", { title: " Q3 " });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/v1/validate/row");
    expect(JSON.parse(init!.body as string)).toEqual({ title: " Q3 " });
    expect(new Headers(init!.headers).has("X-Kanby-Client")).toBe(false);
  });

  test("resolves to the normalized values", async () => {
    respond(200, { ok: true, values: { title: "Q3" } });
    expect(await validateEntity("row", { title: " Q3 " })).toEqual({
      ok: true,
      values: { title: "Q3" },
    });
  });

  test("a 422 resolves to the field and its error", async () => {
    respond(422, { error: "Title is required.", field: "title" });
    expect(await validateEntity("column", { title: "" })).toEqual({
      ok: false,
      field: "title",
      error: "Title is required.",
    });
  });

  test("an unreachable or failing check blocks the save", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("offline"))),
    );
    const offline = await validateEntity("row", { title: "Q3" });
    respond(500, {});
    const failing = await validateEntity("row", { title: "Q3" });
    for (const result of [offline, failing]) {
      expect(result).toEqual({
        ok: false,
        error: "Couldn't check this — try again.",
      });
    }
  });
});
