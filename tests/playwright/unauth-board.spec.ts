/// <reference lib="dom" />
import { expect, testNoClerk as test } from "./fixtures.ts";

// These tests run logged out: a fresh browser context has no Clerk session, so
// the protected /api/board routes should bounce the user back to the homepage.
test.describe("Unauthorized access to /api/board", () => {
  test("a logged-out fetch to /api/board is rejected with 401", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    // Same-origin browser fetch, exactly how the app hits the API. Logged out,
    // the resource rejects with a plain 401 (no redirect) — the friendly
    // dashboard bounce is reserved for top-level navigations, asserted below.
    // Per-method rejection of GET/PUT/DELETE is asserted in
    // tests/vitest/pages/board.test.ts.
    const result = await page.evaluate(async () => {
      const r = await fetch("/api/board");
      return { redirected: r.redirected, status: r.status };
    });

    expect(result.redirected).toBe(false);
    expect(result.status).toBe(401);
  });

  test("shows the unauthorized error on the homepage after the redirect", async ({ page }) => {
    await page.goto("/api/board");
    await expect(page).toHaveURL(/\/dashboard\?unauthorized=1$/);

    const alert = page.locator("#unauthorized-alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Unauthorized request was made");
    await expect(alert).toContainText("You must be logged in");
  });

  test("the user is shown as logged out after the redirect", async ({ page }) => {
    await page.goto("/api/board");
    await expect(page).toHaveURL(/\/dashboard\?unauthorized=1$/);
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });
});
