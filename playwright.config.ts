// NOTE:
// this actually executes in a specialized `playwright` container
// you can call it from the `app` container via `deno task e2e-test`
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  use: {
    baseURL: "https://kanary.local.dev",
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
