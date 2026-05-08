import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: "html",
  use: {
    baseURL: "https://kanary.local.dev",
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
  },
  // webServer: {
  //   command: "deno task dev",
  //   reuseExistingServer: true,
  //   url: "https://kanary.local.dev",
  //   ignoreHTTPSErrors: true,
  //   stdout: "ignore",
  //   stderr: "pipe",
  // },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        launchOptions: {
          args: ["--ignore-certificate-errors"],
        },
      },
    },
  ],
});
