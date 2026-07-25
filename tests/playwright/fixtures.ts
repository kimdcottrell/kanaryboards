import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import {
  type BrowserContext,
  expect,
  type Locator,
  type Page,
  test as base,
} from "@playwright/test";
import { CONSENT_COOKIE } from "../../src/lib/consent.ts";

// A pre-decided "necessary only" consent record, base64url-encoded exactly as
// @policystack/core's cookieAdapter does (dist/consent/storage/cookie.js `encode`).
// Seeding it hides the cookie banner so its fixed bottom bar can't overlap
// controls in unrelated specs. cookie-consent.spec.ts clears it to test the banner.
const consentedRecord = {
  schemaVersion: 1,
  decisions: { essential: true, analytics: false },
  policyVersion: "",
  decidedAt: "2026-01-01T00:00:00.000Z",
  jurisdiction: null,
  locale: "en",
  source: "banner",
};
const consentCookieValue = btoa(JSON.stringify(consentedRecord))
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

async function seedConsentCookie(
  context: BrowserContext,
  baseURL: string | undefined,
): Promise<void> {
  if (!baseURL) return;
  await context.addCookies([
    { name: CONSENT_COOKIE, value: consentCookieValue, url: baseURL },
  ]);
}

// GA used to be suppressed server-side via the x-playwright-test header, but
// HtmlHead.astro no longer reads it (that check blocked prerendering the
// static marketing pages). Block the requests here instead, which keeps
// third-party network noise out of traces and CSP assertions.
async function blockAnalytics(page: Page): Promise<void> {
  await page.route("**/googletagmanager.com/**", (route) => route.abort());
  await page.route("**/google-analytics.com/**", (route) => route.abort());
}

// Fills a React-controlled input and waits until the value actually commits.
// The board mounts via client:only, so shortly after an input becomes
// fillable an early re-render can clobber a freshly-filled controlled input
// back to its state value ("") before onChange settles. Retrying the whole
// fill+assert via toPass re-applies the value until it sticks, which removes
// the cross-browser flakiness around typing into these inputs.
export async function fillStable(
  locator: Locator,
  value: string,
): Promise<void> {
  const page = locator.page();
  // Gate on the board island finishing hydration (BoardView sets this once
  // BOARD/LOAD has committed) so the load re-render can't clobber the value
  // we're about to fill.
  await page.locator("html[data-board-loaded='true']").waitFor({
    state: "attached",
  });
  await fillControlled(locator, value);
}

// Fills a React-controlled input without any board-loaded gate, retrying the
// fill+assert until the value sticks. Use for islands that don't set the
// board-loaded flag (e.g. the homepage HeroStartForm): the retry loop itself
// gates on hydration, since the value only commits once React's onChange is
// wired up.
export async function fillControlled(
  locator: Locator,
  value: string,
): Promise<void> {
  const page = locator.page();
  // A plain SSR input accepts .fill() and holds the value until React hydrates
  // and clobbers it, so the fill can "succeed" before the onSubmit handler is
  // wired — a subsequent click then does nothing. Gate on React having actually
  // hydrated this element (it tags managed host nodes with a __reactFiber$ key)
  // before filling.
  await expect
    .poll(() =>
      locator.evaluate((el) =>
        Object.keys(el).some((k) => k.startsWith("__reactFiber$"))
      )
    )
    .toBe(true);
  // Webkit on CI is the slowest engine and loses the controlled-input commit
  // race most often — give its retry loop more room before failing.
  const isWebkit = page.context().browser()?.browserType().name() === "webkit";
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }).toPass({ timeout: isWebkit ? 20000 : 10000 });
}

// Navigates, then waits for Clerk to finish loading (window.Clerk.loaded).
// Clerk's script is injected site-wide, so without this a test can interact
// with Clerk-driven UI (e.g. sign-up triggers, useAuth-gated forms) before
// window.Clerk exists yet, racing the assertion against the boot script.
export async function gotoAndWaitForClerk(
  page: Page,
  url: string,
): Promise<void> {
  await page.goto(url);
  await clerk.loaded({ page });
}

// Opens the board "+" dropdown in #board-menu and clicks "Add new project row",
// which opens CreateRowModal (the create-row form now lives there, not in the
// board-config gear modal). Gates on hydration so the menu click is stable.
export async function openCreateRowModal(page: Page): Promise<void> {
  await page.locator("html[data-board-loaded='true']").waitFor({
    state: "attached",
  });
  await page.locator(
    "#board-menu summary:has(.hugeicons--dashboard-square-add)",
  ).click();
  await page.locator("#board-menu").getByText("Add new project row").click();
  // Scope to the dialog: an empty board also renders an inline create-new-row.
  await expect(page.locator("dialog [data-testid='create-new-row']"))
    .toBeVisible();
}

// Derive the Clerk Frontend API URL from the publishable key as a fallback.
// CLERK_FAPI is set by clerkSetup() in global.setup.ts, but env vars don't
// always propagate across Playwright worker processes. Parsing the key directly
// ensures setupClerkTestingToken always has what it needs.
const pk = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const fapiFromKey = atob(pk.split("_")[2] ?? "").replace(/\$$/, "");

// Shared body of the auto-fixtures below: register Clerk's FAPI route
// interception, seed consent, block analytics, then run the test.
//
// Note on the "[Clerk Testing] FAPI request failed after 4 attempts ...
// (Error: route.fetch: Test ended.)" warnings this produces: Clerk JS polls the
// FAPI for the life of the document, and setupClerkTestingToken's route handler
// proxies each poll through route.fetch(). A test that ends mid-poll strands the
// handler, and @clerk/testing 2.2.13 retries even unrecoverable errors 4x with
// backoff before warning. It is console noise, not a failure. Draining with
// page.context().unrouteAll({ behavior: "wait" }) was measured and is WORSE — it
// converts the warning into "route.fulfill: Route is already handled!" plus real
// test timeouts. Navigating to about:blank first was also measured: no effect.
// What does help is not registering the route where it isn't needed — see
// testNoClerkToken below, which took the full-suite count from 26 to 7.
async function withClerkTestingToken(
  page: Page,
  baseURL: string | undefined,
  use: () => Promise<void>,
): Promise<void> {
  await setupClerkTestingToken({
    page,
    options: { frontendApiUrl: process.env.CLERK_FAPI ?? fapiFromKey },
  });
  await withoutClerkTestingToken(page, baseURL, use);
}

// The same per-test setup minus the Clerk route interception, for specs that
// never load /dashboard and so can't hit the dev-browser handshake loop the
// token is there to avoid.
async function withoutClerkTestingToken(
  page: Page,
  baseURL: string | undefined,
  use: () => Promise<void>,
): Promise<void> {
  await seedConsentCookie(page.context(), baseURL);
  await blockAnalytics(page);
  await use();
}

// Auto-fixture: runs before every test without needing to be listed in the
// test signature. Registers Clerk FAPI route interception + retry-on-429 logic.
export const test = base.extend<{ clerkSetup: void }>({
  clerkSetup: [
    async ({ page, baseURL }, use) => {
      await withClerkTestingToken(page, baseURL, use);
    },
    { auto: true },
  ],
});

// Use for tests that don't need Clerk authentication. Still injects the Clerk
// testing token (without signing in) so the guest /dashboard skips Clerk's
// dev-browser handshake. Without it, a fresh context has no Clerk cookies, so
// the handshake (dev-browser-missing) redirects/reloads /dashboard repeatedly,
// remounting the board island and resetting boardLoaded — which makes the
// html[data-board-loaded='true'] gate flaky and can exceed the test timeout.
// `test` and `testNoClerk` are distinct TestType extensions, so a union of the
// two isn't callable (their signatures differ). Shared, session-agnostic checks
// that accept either flavor should type their parameter as this common base.
export type SessionTest = typeof base;

export const testNoClerk = base.extend<{ clerkTestingToken: void }>({
  clerkTestingToken: [
    async ({ page, baseURL }, use) => {
      await withClerkTestingToken(page, baseURL, use);
    },
    { auto: true },
  ],
});

// Use for guest specs that never navigate to /dashboard. They still load Clerk
// JS (it's injected site-wide) and still poll the FAPI, but without the route
// interception those polls go straight to Clerk instead of being proxied
// through route.fetch() — so a test ending mid-poll can't strand a handler.
// Trade-off: these specs lose the testing token's bot-protection bypass and
// @clerk/testing's retry-on-429 proxy. Acceptable here only because none of
// them assert on Clerk-driven UI; their content is server-rendered.
export const testNoClerkToken = base.extend<{ noClerkToken: void }>({
  noClerkToken: [
    async ({ page, baseURL }, use) => {
      await withoutClerkTestingToken(page, baseURL, use);
    },
    { auto: true },
  ],
});

// Starts already signed in as the E2E account, by loading the storage state
// global.setup.ts writes after its own clerk.signIn(). Saves a full sign-in
// round-trip per test, which is both slow and extra FAPI traffic to strand at
// teardown. Use `test` instead when a spec needs to *become* signed in partway
// through (board-persistence.spec.ts tests the guest → account migration).
//
// Built on testNoClerkToken, not `test`: the storage state already carries
// Clerk's cookies (__clerk_db_jwt, __session, __client_uat), which is exactly
// what the dev-browser handshake would otherwise have to fetch — so the testing
// token has nothing left to fix here.
export const AUTH_FILE = "tests/playwright/.clerk/user.json";

export const testAuthed = testNoClerkToken.extend({ storageState: AUTH_FILE });
export { expect };
