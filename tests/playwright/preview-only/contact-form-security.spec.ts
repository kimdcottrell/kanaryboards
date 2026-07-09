/// <reference lib="dom" />
import { expect, testNoClerk as test } from "../fixtures.ts";

// A "malicious user" suite for the /contact form. RESEND_API_KEY is set in
// this environment, so the real /api/contact route would actually call
// Resend for any schema-valid payload — even one submitted through the
// browser. Every test here registers page.route("**/api/contact", ...)
// BEFORE interacting with the form, so the real server (and therefore
// Resend) is never reached: the browser's own fetch("/api/contact") call is
// intercepted client-side. XSS-escaping of the outgoing email body itself is
// verified separately in tests/vitest/pages/contact.test.ts, which mocks the
// Resend client directly.
//
// This suite lives under preview-only/ (not because it needs a prod build —
// it doesn't — but per policy: no Playwright spec that fires attack-shaped
// payloads should be reachable via `deno task e2e-test`, whose BASE_URL can
// point at a real deployed environment).

const nameInput = (page: import("@playwright/test").Page) =>
  page.locator("#contact-name");
const emailInput = (page: import("@playwright/test").Page) =>
  page.locator("#contact-email");
const messageInput = (page: import("@playwright/test").Page) =>
  page.locator("#contact-message");
const submitButton = (page: import("@playwright/test").Page) =>
  page.locator("[data-submit-button]");
const successAlert = (page: import("@playwright/test").Page) =>
  page.locator("[data-success]");
const errorAlert = (page: import("@playwright/test").Page) =>
  page.locator("[data-error]");

test.describe("Contact form — form injection & client-validation safety", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contact");
  });

  test("empty submit does not call /api/contact", async ({ page }) => {
    const apiCall = page
      .waitForRequest("**/api/contact", { timeout: 1500 })
      .catch(() => null);

    await submitButton(page).click();

    expect(await apiCall).toBeNull();
  });

  test("invalid email format does not call /api/contact", async ({ page }) => {
    const apiCall = page
      .waitForRequest("**/api/contact", { timeout: 1500 })
      .catch(() => null);

    await nameInput(page).fill("Ada Lovelace");
    await emailInput(page).fill("not-an-email");
    await messageInput(page).fill("Hello there");
    await submitButton(page).click();

    expect(await apiCall).toBeNull();
  });

  test("name input cannot be typed past 100 characters", async ({ page }) => {
    await nameInput(page).fill("a".repeat(150));
    await expect(nameInput(page)).toHaveValue("a".repeat(100));
  });

  test("message textarea cannot be typed past 500 characters", async ({ page }) => {
    await messageInput(page).fill("a".repeat(600));
    await expect(messageInput(page)).toHaveValue("a".repeat(500));
  });

  test("an XSS-shaped but schema-valid payload is sent verbatim (server escapes, not the client)", async ({ page }) => {
    let requestBody: Record<string, string> | null = null;
    await page.route("**/api/contact", (route) => {
      requestBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    const payload = "<script>window.__xss=1</script>";
    await nameInput(page).fill(payload);
    await emailInput(page).fill("ada@example.com");
    await messageInput(page).fill(payload);
    await submitButton(page).click();

    await expect(successAlert(page)).toBeVisible();
    expect(requestBody).toEqual({
      name: payload,
      email: "ada@example.com",
      message: payload,
    });

    // The payload never executes: it only ever exists as form-field text and
    // a JSON string, never inserted into the DOM as markup.
    const xssRan = await page.evaluate(() =>
      (globalThis as Record<string, unknown>).__xss
    );
    expect(xssRan).toBeUndefined();
  });

  test("a malicious error message from the server renders as inert text", async ({ page }) => {
    const maliciousError = `<img src=x onerror="window.__xss=1">`;
    await page.route("**/api/contact", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: maliciousError }),
      }));

    await nameInput(page).fill("Ada Lovelace");
    await emailInput(page).fill("ada@example.com");
    await messageInput(page).fill("Hello there");
    await submitButton(page).click();

    await expect(errorAlert(page)).toBeVisible();
    await expect(page.locator("[data-error-message]")).toHaveText(
      maliciousError,
    );

    // No <img> was created from the message — it's rendered via
    // textContent, not innerHTML — so onerror never fires.
    const xssRan = await page.evaluate(() =>
      (globalThis as Record<string, unknown>).__xss
    );
    expect(xssRan).toBeUndefined();
    expect(
      await page.locator("[data-error-message] img").count(),
    ).toBe(0);
  });
});
