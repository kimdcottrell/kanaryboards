import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Must run serially: https://playwright.dev/docs/test-parallel
setup.describe.configure({ mode: "serial" });

setup("global setup", async () => {
  await clerkSetup({
    // Astro uses PUBLIC_CLERK_PUBLISHABLE_KEY; the testing package looks for
    // CLERK_PUBLISHABLE_KEY. Pass it directly to avoid duplicating the var in .env.
    // --env-file=.env in the deno task makes this available.
    publishableKey: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
});
