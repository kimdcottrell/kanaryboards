import { defineConfig, devices } from "@playwright/test";

// this has to get setup.
// the usual url of this project locally is kanary.local.dev,
// but for testing, it is localhost:8085, UNLESS we're in CI
const BASE_URL = process.env.CI
  ? process.env.BASE_URL!
  : "http://localhost:8085";

const SHARED_ACCOUNT_SPECS = [
  "**/board-persistence.spec.ts",
  "**/hero-start-form.spec.ts",
  "**/drawer-row-list-mirror.spec.ts",
  "**/drawer-row-nav.spec.ts",
];

export default defineConfig({
  testDir: "tests/playwright",
  testIgnore: "**/preview-only/**",
  // In CI the tests run against the Deno Deploy preview at BASE_URL, so there is
  // nothing to boot locally. `webServer` runs regardless of `baseURL`, and its
  // `url` probe only ever checks localhost:8085 — so leaving it on made CI try to
  // run `deno` on a runner that only has node installed.
  webServer: process.env.CI ? undefined : {
    // PROD build → src/middleware.ts emits the security headers on every response.
    command: `BASE_URL="${BASE_URL}" deno task build && deno task preview`,
    url: "http://localhost:8085",
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
      // A project-level testIgnore replaces the top-level one, so repeat it.
      testIgnore: ["**/preview-only/**", ...SHARED_ACCOUNT_SPECS],
    },
    {
      // These specs wipe and re-seed the shared Clerk test account's KV board,
      // so running them in parallel lets one clobber another's seed mid-test.
      name: "chromium-shared-account",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: SHARED_ACCOUNT_SPECS,
      workers: 1,
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
