/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Worker-runtime tests live in tests/workers and run under
// @cloudflare/vitest-pool-workers instead (see vitest.workers.config.ts) —
// they need a real simulated Worker runtime (KV bindings via
// `cloudflare:test`), which this jsdom-based project can't provide. They're
// kept outside `dir` so this suite never tries to collect them.
const astroViteConfig = getViteConfig({
  test: {
    dir: "tests/vitest",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/vitest/localStorage.setup.ts"],
    reporters: ["default", "github-actions"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});

// Drop @astrojs/cloudflare's Vite plugins. getViteConfig() loads the real
// astro.config.mjs, so the adapter's plugins come along and refuse to run
// against Astro's SSR `resolve.external` list — aborting the whole suite
// before any test starts. These are jsdom component/unit tests that never
// touch the Worker runtime, so the plugins have nothing to contribute here.
export default async (env: Parameters<typeof astroViteConfig>[0]) => {
  const config = await astroViteConfig(env);
  return {
    ...config,
    plugins: (config.plugins ?? []).filter((plugin) =>
      !(plugin && typeof plugin === "object" && "name" in plugin &&
        typeof plugin.name === "string" &&
        plugin.name.startsWith("vite-plugin-cloudflare:"))
    ),
  };
};
