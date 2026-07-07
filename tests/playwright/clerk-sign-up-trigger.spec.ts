import { clerk } from "@clerk/testing/playwright";
import { expect, test, testNoClerk } from "./fixtures.ts";

const E2E_EMAIL = process.env.E2E_CLERK_USER_EMAIL ?? "";
const trigger = (page: import("@playwright/test").Page) =>
  page.locator("[data-open-clerk-sign-up-modal]").first();
const signUpModalHeading = (page: import("@playwright/test").Page) =>
  page.getByRole("heading", { name: "Create your account" });

testNoClerk.describe("Clerk sign-up trigger — anonymous", () => {
  testNoClerk.beforeEach(async ({ page }) => {
    await page.goto("/about");
  });

  testNoClerk(
    "opens Clerk's sign-up modal and does not navigate",
    async ({ page }) => {
      await trigger(page).click();
      await expect(signUpModalHeading(page)).toBeVisible();
      expect(new URL(page.url()).pathname).toBe("/about");
    },
  );

  testNoClerk("has no tooltip when signed out", async ({ page }) => {
    await expect(trigger(page)).not.toHaveClass(/tooltip/);
    await expect(trigger(page)).not.toHaveAttribute("data-tip");
  });
});

test.describe("Clerk sign-up trigger — authenticated", () => {
  // Shares one Clerk test account across runs — same guard used in
  // hero-start-form.spec.ts's authenticated block.
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "shares one Clerk test account across runs",
    );
    await page.goto("/about");
    await clerk.signIn({ page, emailAddress: E2E_EMAIL });
  });

  test(
    "shows the already-signed-in tooltip and does nothing on click",
    async ({ page }) => {
      await expect(trigger(page)).toHaveClass(/tooltip-top/);
      await expect(trigger(page)).toHaveAttribute(
        "data-tip",
        "You're already logged in, clicking this will do nothing",
      );

      await trigger(page).click();

      await expect(signUpModalHeading(page)).toBeHidden();
      expect(new URL(page.url()).pathname).toBe("/about");
    },
  );
});
