// NOTE:
// this actually executes in a specialized `playwright` container
// you can call it from the `app` container via `deno task e2e-test`
import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/playwright",
  // Runs against the dev server, where the security headers don't exist. That
  // suite has its own config (playwright.security.config.ts) + `deno task
  // e2e-security`, which forces a prod build+preview.
  testIgnore: "**/security-headers.spec.ts",
  ...(process.env.START_DEV_SERVER
    ? {
      webServer: {
        command: "deno task dev",
        reuseExistingServer: true,
        url: "https://kanary.local.dev",
        wait: {
          stdout: /watching for file changes.../,
        },
      },
    }
    : {}),
  // sometimes the first test run fails due to what I can only imagine are
  // the ghosts in the machine
  retries: 2,
  // The app is served by the dev server (client:only React island), so the
  // initial mount can take longer than the 5s default under concurrent
  // multi-browser load — give web-first assertions more room before failing.
  expect: { timeout: 10_000 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    baseURL: process.env.BASE_URL ?? "https://kanary.local.dev",
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      "x-playwright-test": "true",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/global.setup.ts",
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: "**/global.teardown.ts",
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["setup"],
    },
  ],
  reporter: [
    ["html"],
    ["list"],
  ],
});
