import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test as base } from "@playwright/test";

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
