// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import deno from "@deno/astro-adapter";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import clerk from "@clerk/astro";
import sitemap from "@astrojs/sitemap";

const SITE = "https://kanby.ai";

// https://astro.build/config
export default defineConfig({
  adapter: deno(),
  integrations: [
    clerk(),
    react(),
    sitemap({
      // /blog/* routes are rendered on demand, so the sitemap integration
      // can't discover them by crawling static build output; they publish
      // their own sitemap fragment instead (see src/pages/sitemap-blog.xml.ts).
      customSitemaps: [`${SITE}/sitemap-blog.xml`],
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

  redirects: {
    "/blog/tags": "/blog",
  },

  site: SITE,

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
              },
            },
          },
        },
      },
    },
  },
});
