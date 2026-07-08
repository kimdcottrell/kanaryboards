import { type Page } from "@playwright/test";
import { expect, testNoClerk as test } from "./fixtures.ts";
import { CONSENT_COOKIE } from "../../src/lib/consent.ts";

// gtag never loads under Playwright (the x-playwright-test header suppresses GA),
// so these assert on the consent cookie + banner UI, not on Consent Mode calls.

function parseConsent(value: string) {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

async function readConsent(page: Page) {
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === CONSENT_COOKIE,
  );
  return cookie ? parseConsent(cookie.value) : null;
}

const banner = (page: Page) => page.locator("[data-policystack-banner]");
const prefs = (page: Page) => page.locator("[data-policystack-prefs]");

test.describe("Cookie consent banner", () => {
  test.beforeEach(async ({ page }) => {
    // The shared fixture seeds a consent cookie so the banner stays out of other
    // specs; clear it here so the banner shows for a first-time visitor.
    await page.context().clearCookies({ name: CONSENT_COOKIE });
  });

  test("shows for a first-time visitor on the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(banner(page)).toBeVisible();
  });

  test("also shows on the dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(banner(page)).toBeVisible();
  });

  test("'Necessary only' hides the banner and records analytics=false", async ({ page }) => {
    await page.goto("/");
    await banner(page).getByRole("button", { name: "Necessary only" }).click();
    await expect(banner(page)).toBeHidden();
    expect((await readConsent(page))?.decisions.analytics).toBe(false);
  });

  test("'Accept all' hides the banner and records analytics=true", async ({ page }) => {
    await page.goto("/");
    await banner(page).getByRole("button", { name: "Accept all" }).click();
    await expect(banner(page)).toBeHidden();
    expect((await readConsent(page))?.decisions.analytics).toBe(true);
  });

  test("Customize → enable Analytics → Save records analytics=true", async ({ page }) => {
    await page.goto("/");
    await banner(page).getByRole("button", { name: "Customize" }).click();
    await expect(prefs(page)).toHaveClass(/modal-open/);
    // Essential is always on and cannot be toggled.
    await expect(page.locator('input[data-category="essential"]'))
      .toBeDisabled();
    await page.locator('input[data-category="analytics"]').check();
    await prefs(page).getByRole("button", { name: "Save preferences" }).click();
    await expect(banner(page)).toBeHidden();
    expect((await readConsent(page))?.decisions.analytics).toBe(true);
  });

  test("reopens via the footer and persists across reloads", async ({ page }) => {
    await page.goto("/");
    await banner(page).getByRole("button", { name: "Accept all" }).click();
    await expect(banner(page)).toBeHidden();

    // Persists: a reload keeps the banner hidden.
    await page.reload();
    await expect(banner(page)).toBeHidden();

    // The footer "Cookie settings" control reopens it.
    await page.locator("[data-open-cookie-settings]").click();
    await expect(banner(page)).toBeVisible();
  });
});
