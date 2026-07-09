/// <reference lib="dom" />
import { expect, testNoClerk as test } from "../fixtures.ts";

// A "malicious user" suite for the Mailchimp SubscribeForm (footer, every
// page). A real submission POSTs to Mailchimp's hosted endpoint in a new
// tab — every test here intercepts/aborts that request via context.route()
// before submitting, so no test ever creates a real subscriber.
//
// Lives under preview-only/ per policy: no Playwright spec that triggers a
// real (even if intercepted) third-party form submission should be
// reachable via `deno task e2e-test`, whose BASE_URL can point at a real
// deployed environment.

const EXPECTED_ACTION =
  "https://kanby.us6.list-manage.com/subscribe/post?u=cdd9f0d14a8a33cdf4471d205&id=444ff43317&f_id=006fb5e0f0";
const HONEYPOT_NAME = "b_cdd9f0d14a8a33cdf4471d205_444ff43317";

const subscribeForm = (page: import("@playwright/test").Page) =>
  page.locator("#mc-embedded-subscribe-form");
const emailInput = (page: import("@playwright/test").Page) =>
  page.locator("#mce-EMAIL");
const submitButton = (page: import("@playwright/test").Page) =>
  page.locator("#mc-embedded-subscribe");

test.describe("Mailchimp subscribe form — form-action safety", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // The form is a server:defer island — wait for it to actually mount.
    await expect(subscribeForm(page)).toBeAttached();
  });

  test("the form action points to the exact expected Mailchimp endpoint", async ({ page }) => {
    await expect(subscribeForm(page)).toHaveAttribute(
      "action",
      EXPECTED_ACTION,
    );
  });

  test("the honeypot field is present, empty, hidden, and not required", async ({ page }) => {
    const honeypot = page.locator(`input[name="${HONEYPOT_NAME}"]`);
    await expect(honeypot).toHaveValue("");
    await expect(honeypot).not.toHaveAttribute("required", "");

    const wrapperStyle = await honeypot.locator("..").getAttribute("style");
    expect(wrapperStyle).toContain("position: absolute");
    expect(wrapperStyle).toContain("-5000px");
  });

  test("an invalid email is blocked by native validation — no tab opens", async ({ page, context }) => {
    const popup = context.waitForEvent("page", { timeout: 2000 }).catch(() =>
      null
    );

    await emailInput(page).fill("not-an-email");
    await submitButton(page).click();

    expect(await popup).toBeNull();
  });

  test("a valid email submits toward Mailchimp only (aborted before it ever lands)", async ({ page, context }) => {
    // mc-validate.js (loaded from s3.amazonaws.com, allowlisted in the CSP)
    // intercepts a valid submit and does its own AJAX/JSONP-style request to
    // Mailchimp instead of a full target="_blank" navigation, so a route
    // scoped to list-manage.com — not a popup — is what proves the
    // destination. Close any stray popup regardless, in case JS fails to
    // load in some environment and the native fallback opens one.
    context.on("page", (popup) => popup.close().catch(() => {}));

    let mailchimpHit = false;
    await context.route("**/*.list-manage.com/**", (route) => {
      mailchimpHit = true;
      return route.abort();
    });

    await emailInput(page).fill("e2e-test@example.com");
    await submitButton(page).click();

    await expect.poll(() => mailchimpHit, { timeout: 10000 }).toBe(true);
  });
});
