import { expect, testNoClerkToken as test } from "./fixtures.ts";

test.describe("POST /api/v1/ai/task-titles — live API connection", () => {
  test("returns 200 with a non-empty task list for a real prompt", async ({ request }) => {
    const response = await request.post("/api/v1/ai/task-titles", {
      data: { prompt: "Make a pizza" },
      timeout: 30000,
    });
    test.skip(response.status() === 503, "Google AI unavailable (503)");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.response)).toBe(true);
    expect(body.response.length).toBeGreaterThan(0);
    for (const task of body.response) {
      expect(typeof task).toBe("string");
      expect(task.length).toBeGreaterThan(0);
    }
  });
});
