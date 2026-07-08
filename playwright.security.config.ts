// Dedicated Playwright config for the "malicious user" security-header suite.
//
// The security headers in src/middleware.ts are only emitted when
// import.meta.env.PROD is true (see the `if (import.meta.env.PROD)` gate), so
// they do NOT exist under `deno task dev`. This config therefore forces a fresh
// production `build` + `preview` and points the tests at that server.
//
// Run it with `deno task e2e-security` (local only), which uses the same remote
// browser server as the main suite (ws://playwright:3000). Playwright forwards
// the runner's localhost to that browser, so the preview is reached at
// http://localhost:8085.
import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:8085"; // local preview server

export default defineConfig({
  testDir: "tests/playwright",
  testMatch: "**/security-headers.spec.ts",
  webServer: {
    // PROD build → src/middleware.ts emits the security headers on every response.
    command: "deno task build && deno task preview",
    url: BASE,
    reuseExistingServer: false, // always exercise a freshly built server
    timeout: 240_000, // build + boot can take a while
  },
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    // Matches the main config: the app suppresses Google Analytics for this
    // header, which keeps third-party script noise out of the CSP assertions.
    extraHTTPHeaders: { "x-playwright-test": "true" },
    // The browser runs in the remote playwright container, so its own localhost
    // is NOT the app container's preview. exposeNetwork tunnels the runner's
    // loopback to the remote browser so it can reach http://localhost:8085.
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
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [["list"]],
});
