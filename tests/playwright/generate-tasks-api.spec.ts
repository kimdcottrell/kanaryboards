import { expect, test } from "@playwright/test";

// Override baseURL for this spec: the request fixture runs in the test runner process
// (app container), so localhost:4321 reaches the dev server directly, bypassing Traefik.
// Browser-based specs keep the global baseURL (https://kanary.local.dev).
test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:4321" });

test.describe("POST /api/generate-tasks — live API connection", () => {
  test("returns 200 with a non-empty task list for a real prompt", async ({ request }) => {
    const response = await request.post("/api/generate-tasks", {
      data: { prompt: "Make a pizza" },
      timeout: 30000,
    });
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
