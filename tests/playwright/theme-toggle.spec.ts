import { expect, testNoClerk as test } from "./fixtures.ts";

test.describe("ThemeController", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test.describe("initial theme from system preference", () => {
    test("defaults to kanary-day when prefers-color-scheme is light", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/");

      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "kanary-day");
      await expect(html).toHaveClass(/latte/);
      await expect(html).not.toHaveClass(/mocha/);
    });

    test("defaults to kanary-night when prefers-color-scheme is dark", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");

      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "kanary-night");
      await expect(html).toHaveClass(/mocha/);
      await expect(html).not.toHaveClass(/latte/);
    });
  });

  test.describe("theme toggle", () => {
    test("switches from light to dark when toggle is clicked", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/" ,{ waitUntil: 'load', });

      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "kanary-day");

      await page.locator("#theme-controller").click();

      await expect(html).toHaveAttribute("data-theme", "kanary-night");
      await expect(html).toHaveClass(/mocha/);
      await expect(html).not.toHaveClass(/latte/);
    });

    test("switches from dark to light when toggle is clicked", async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/", { waitUntil: 'load' });

      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "kanary-night");

      await page.locator("#theme-controller").click();

      await expect(html).toHaveAttribute("data-theme", "kanary-day");
      await expect(html).toHaveClass(/latte/);
      await expect(html).not.toHaveClass(/mocha/);
    });

    test("toggles back to original theme on second click", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/", { waitUntil: 'load' });

      const toggle = page.locator("#theme-controller");
      const html = page.locator("html");

      await toggle.click();
      await expect(html).toHaveAttribute("data-theme", "kanary-night");

      await toggle.click();
      await expect(html).toHaveAttribute("data-theme", "kanary-day");
      await expect(html).toHaveClass(/latte/);
      await expect(html).not.toHaveClass(/mocha/);
    });
  });

  test.describe("localStorage persistence", () => {
    test("saves theme to localStorage after toggling", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/", { waitUntil: 'load' });

      await page.locator("#theme-controller").click();

      const stored = await page.evaluate(() => localStorage.getItem("theme"));
      expect(stored).toBe("kanary-night");
    });

    test("restores saved theme from localStorage on reload", async ({
      page,
    }) => {
      await page.addInitScript(() => localStorage.setItem("theme", "kanary-night"));
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/", { waitUntil: 'load' });

      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "kanary-night");

      await page.reload();

      await expect(html).toHaveAttribute("data-theme", "kanary-night");
      await expect(html).toHaveClass(/mocha/);
      await expect(html).not.toHaveClass(/latte/);
    });

    test("localStorage value overrides system preference on load", async ({
      page,
    }) => {
      await page.addInitScript(() =>
        localStorage.setItem("theme", "kanary-day")
      );
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/", { waitUntil: 'load' });

      const html = page.locator("html");
      await expect(html).toHaveAttribute("data-theme", "kanary-day");
      await expect(html).toHaveClass(/latte/);
      await expect(html).not.toHaveClass(/mocha/);
    });
  });
});
