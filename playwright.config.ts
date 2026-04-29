import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: "html",
  use: {
    baseURL: "https://kanaryboards.kimdcottrell.deno.net",
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
  },
  // webServer: {
  //   // command: "npm run start",
  //   reuseExistingServer: true,
  //   url: "http://app:4321",
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
