// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import deno from "@deno/astro-adapter";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import clerk from "@clerk/astro";
import sitemap from "@astrojs/sitemap";

const site = Deno.env.get("SITE") || "https://kanby.ai";

// Clerk publishable keys are PUBLIC (they are designed to ship to the browser),
// so hardcoding all three here is safe.
// This exists to get around a nasty bug where Deno Deploy is not generating SSR
// island secrets properly for pre-rendered pages, and this is affecting Clerk
export function pickClerkPublishableKey(mode) {
  switch (mode) {
    case "production":
      return "pk_live_Y2xlcmsua2FuYnkuYWkk";
    case "development":
      return "pk_test_Z3VpZGVkLWJyZWFtLTc5LmNsZXJrLmFjY291bnRzLmRldiQ";
    default:
      return "pk_test_bmF0aXZlLXplYnJhLTU5LmNsZXJrLmFjY291bnRzLmRldiQ";
  }
}

// https://astro.build/config
export default defineConfig({
  adapter: deno(),
  integrations: [
    // @ts-expect-error `publishableKey` is applied at runtime (merged into the
    // injected boot script via internalParams), but it's typed only on
    // AstroClerkCreateInstanceParams, not the integration's params.
    clerk({ publishableKey: pickClerkPublishableKey(import.meta.env.MODE) }),
    react(),
    sitemap({
      // /blog/* routes are rendered on demand, so the sitemap integration
      // can't discover them by crawling static build output; they publish
      // their own sitemap fragment instead (see src/pages/sitemap-blog.xml.ts).
      customSitemaps: [`${site}/sitemap-blog.xml`],
      filter: (page) =>
        page !== `${site}/build/` &&
        page !== `${site}/ssr/`,
    }),
  ],

  output: "server",

  markdown: {
    shikiConfig: {
      // `light` is applied inline by default (day mode keeps the dark code
      // block); `dark` is exposed as --shiki-dark* CSS vars and switched on
      // under [data-theme=kanary-night] in global.css.
      themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
    },
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: "PT Mono",
      cssVariable: "--font-pt-mono",
      weights: ["400"],
      styles: ["normal"],
    },
    {
      provider: fontProviders.google(),
      name: "Cherry Bomb One",
      cssVariable: "--font-cherry-bomb-one",
      weights: ["400"],
      styles: ["normal"],
    },
    {
      provider: fontProviders.google(),
      name: "Roboto Slab",
      cssVariable: "--font-roboto-slab",
      weights: ["100 900"],
      styles: ["normal", "italic"],
    },
    {
      provider: fontProviders.google(),
      name: "Nunito",
      cssVariable: "--font-nunito",
      weights: ["200 1000"],
    },
    {
      provider: fontProviders.google(),
      name: "Inter",
      cssVariable: "--font-inter",
      weights: ["100 900"],
      styles: ["normal", "italic"],
    },
  ],

  prefetch: true,

  site: site,

  server: {
    port: 4321,
    host: "0.0.0.0",
    allowedHosts: [
      "0.0.0.0",
      "localhost",
      "kanary.local.dev",
      "kanby--local.kimdcottrell.deno.net",
    ],
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
    // Strip console.*/debugger from bundled client JS. Vite 8 bundles with
    // Rolldown/Oxc (not esbuild), so `esbuild.drop` is ignored — the equivalent
    // lives in the Oxc minifier's `compress` options. Scoped to the `client`
    // environment so the SSR/prerender bundles stay unminified: a global
    // minify override breaks the server build and would also drop server logs.
    // Astro spreads this over its own client output config, so it wins.
    environments: {
      client: {
        build: {
          rolldownOptions: {
            output: {
              minify: {
                compress: {
                  dropConsole: true,
                  dropDebugger: true,
                },
                mangle: true, // Makes the names shorter. ( func_Name -> c)
                codegen: true, // Makes the text tighter. (strip newlines, etc)
              },
            },
          },
        },
      },
    },
  },
});
