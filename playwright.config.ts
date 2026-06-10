// NOTE:
// this actually executes in a specialized `playwright` container
// you can call it from the `app` container via `deno task e2e-test`
import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

// TODO: https://stackoverflow.com/questions/74796008/how-to-generate-test-with-playwright-and-codegen-from-a-docker-container
//       https://github.com/microsoft/playwright-python/issues/274
export default defineConfig({
  testDir: 'tests/playwright',
  ...(process.env.START_DEV_SERVER ? {
    webServer: {
      command: 'deno task dev',
      reuseExistingServer: true,
      url: 'https://kanary.local.dev',
      wait: {
        stdout: /watching for file changes.../,
      },
    },
  } : {}),
  retries: 1, // sometimes the first test run fails due to what I can only imagine are the ghosts in the machine, so we retry once
  use: {
    baseURL: process.env.BASE_URL ?? "https://kanary.local.dev",
    ignoreHTTPSErrors: true,
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
});
