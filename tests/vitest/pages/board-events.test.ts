// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";

// One emission on subscribe, as kv.watch() does, then one per board write.
let watchEmissions = 1;
vi.mock("@lib/db/kv.ts", () => ({
  watchBoard: vi.fn(() =>
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < watchEmissions; i++) controller.enqueue([]);
        controller.close();
      },
    })
  ),
}));

const { GET } = await import("@pages/api/v1/board/events.ts");

function makeContext(
  { userId, boardId }: { userId: string | null; boardId?: string },
): APIContext {
  return {
    request: new Request("http://localhost/api/v1/board/events"),
    locals: { auth: () => ({ userId }), boardId },
  } as unknown as APIContext;
}

describe("/api/v1/board/events", () => {
  test("returns 401 when unauthenticated", async () => {
    const res = await GET(makeContext({ userId: null, boardId: "b1" }));
    expect(res.status).toBe(401);
  });

  test("returns 401 when boardId is missing", async () => {
    const res = await GET(makeContext({ userId: "user_1" }));
    expect(res.status).toBe(401);
  });

  test("streams one change event per watch emission", async () => {
    watchEmissions = 2;
    const res = await GET(makeContext({ userId: "user_1", boardId: "b1" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(await res.text()).toBe("data: change\n\n".repeat(2));
  });
});
