import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Locator, test as base } from "@playwright/test";

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
  // Webkit on CI is the slowest engine and loses the controlled-input commit
  // race most often — give its retry loop more room before failing.
  const isWebkit = page.context().browser()?.browserType().name() === "webkit";
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }).toPass({ timeout: isWebkit ? 20000 : 10000 });
}

// Derive the Clerk Frontend API URL from the publishable key as a fallback.
// CLERK_FAPI is set by clerkSetup() in global.setup.ts, but env vars don't
// always propagate across Playwright worker processes. Parsing the key directly
// ensures setupClerkTestingToken always has what it needs.
const pk = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const fapiFromKey = atob(pk.split("_")[2] ?? "").replace(/\$$/, "");

// Auto-fixture: runs before every test without needing to be listed in the
// test signature. Registers Clerk FAPI route interception + retry-on-429 logic.
export const test = base.extend<{ clerkSetup: void }>({
  clerkSetup: [
    async ({ page }, use) => {
      await setupClerkTestingToken({
        page,
        options: { frontendApiUrl: process.env.CLERK_FAPI ?? fapiFromKey },
      });
      await use();
    },
    { auto: true },
  ],
});

// Use for tests that don't need Clerk authentication — avoids per-test Clerk API calls.
export const testNoClerk = base;
export { expect };
