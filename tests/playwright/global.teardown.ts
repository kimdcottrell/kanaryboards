import { test as teardown } from "@playwright/test";

teardown("delete e2e test data", async ({ request }) => {
  await request.delete("/api/v1/test-data");
});
