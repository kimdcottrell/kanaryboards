import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  test: {
    dir: "tests/workers",
  },
  // Mirrors the `paths` aliases in tsconfig.json. The jsdom suite gets these
  // from astro's getViteConfig(); this config doesn't use it, so they're
  // declared explicitly.
  resolve: {
    alias: {
      "@components": new URL("./src/components", import.meta.url).pathname,
      "@layouts": new URL("./src/layouts", import.meta.url).pathname,
      "@lib": new URL("./src/lib", import.meta.url).pathname,
      "@pages": new URL("./src/pages", import.meta.url).pathname,
      "@src": new URL("./src", import.meta.url).pathname,
      "@styles": new URL("./src/styles", import.meta.url).pathname,
    },
  },
  plugins: [
    cloudflareTest({
      // Bindings are declared here rather than via `wrangler.configPath`:
      // wrangler.jsonc's `main` is the adapter's bare package specifier
      // (@astrojs/cloudflare/entrypoints/server), which the pool tries to
      // resolve as a filesystem path and fails on. These are unit tests
      // against the KV binding, not the Worker's fetch handler, so no
      // entrypoint is needed — keep the binding names in sync with
      // wrangler.jsonc.
      miniflare: {
        compatibilityDate: "2026-07-29",
        compatibilityFlags: ["nodejs_compat"],
        kvNamespaces: ["BOARD_KV"],
      },
    }),
  ],
});
