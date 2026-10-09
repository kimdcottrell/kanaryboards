// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";

const counts = {
  boardsScanned: 3,
  boardsUpdated: 1,
  tasksDeleted: 2,
  conflicts: 0,
};

vi.mock("@lib/db/kv.ts", () => ({
  purgeExpiredTrash: vi.fn(() => Promise.resolve(counts)),
}));

const { POST } = await import("@pages/api/purge-trash.ts");
const { purgeExpiredTrash } = await import("@lib/db/kv.ts");

function makeContext(authorization?: string): APIContext {
  const headers = new Headers();
  if (authorization) headers.set("Authorization", authorization);
  return {
    request: new Request("http://localhost/api/purge-trash", {
      method: "POST",
      headers,
    }),
  } as unknown as APIContext;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/purge-trash", () => {
  test("returns 500 and does not purge when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await POST(makeContext("Bearer "));
    expect(res.status).toBe(500);
    expect(purgeExpiredTrash).not.toHaveBeenCalled();
  });

  test.each([undefined, "Bearer wrong", "s3cret"])(
    "returns 401 for Authorization %s",
    async (authorization) => {
      vi.stubEnv("CRON_SECRET", "s3cret");
      const res = await POST(makeContext(authorization));
      expect(res.status).toBe(401);
      expect(purgeExpiredTrash).not.toHaveBeenCalled();
    },
  );

  test("purges and returns the counts with the right bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const res = await POST(makeContext("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(counts);
    expect(purgeExpiredTrash).toHaveBeenCalledOnce();
  });
});
