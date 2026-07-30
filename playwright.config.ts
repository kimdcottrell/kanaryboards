import { defineConfig, devices } from "@playwright/test";

// this has to get setup.
// the usual url of this project locally is kanary.local.dev,
// but for testing, it is localhost:8085, UNLESS we're in CI
const BASE_URL = process.env.CI
  ? process.env.BASE_URL!
  : "http://localhost:4321";

export default defineConfig({
  testDir: "tests/playwright",
  testIgnore: "**/preview-only/**",
  // In CI the tests run against the Deno Deploy preview at BASE_URL, so there is
  // nothing to boot locally. `webServer` runs regardless of `baseURL`, and its
  // `url` probe only ever checks localhost:8085 — so leaving it on made CI try to
  // run `deno` on a runner that only has node installed.
  webServer: process.env.CI ? undefined : {
    // PROD build → src/middleware.ts emits the security headers on every response.
    command: `BASE_URL="${BASE_URL}" wrangler dev --port 4321`,
    url: `${BASE_URL}`,
    reuseExistingServer: true, // skip build+preview if a server is already up at BASE
    timeout: 240_000, // build + boot can take a while
  },
  // sometimes the first test run fails due to what I can only imagine are
  // the ghosts in the machine
  retries: 2,
  // The app is served by the dev server (client:only React island), so the
  // initial mount http://localhost:8085can take longer than the 5s default under concurrent
  // multi-browser load — give web-first assertions more room before failing.
  expect: { timeout: 10_000 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      "x-playwright-test": "true",
    },
    ...(process.env.PW_TEST_CONNECT_WS_ENDPOINT
      ? {
        connectOptions: {
          wsEndpoint: process.env.PW_TEST_CONNECT_WS_ENDPOINT,
          exposeNetwork: "<loopback>",
        },
      }
      : {}),
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
