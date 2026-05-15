// NOTE:
// this actually executes in a specialized `playwright` container
// you can call it from the `app` container via `deno task e2e-test`
import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: 'tests/playwright',
  ...(process.env.START_DEV_SERVER ? {
    webServer: {
      command: 'deno task dev',
      reuseExistingServer: true,
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
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
