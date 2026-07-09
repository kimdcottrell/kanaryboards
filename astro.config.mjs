// @ts-check
import { defineConfig, fontProviders } from "astro/config";
/** @typedef {import("astro").HookParameters<"astro:build:done">} BuildDoneParams */
import deno from "@deno/astro-adapter";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import clerk from "@clerk/astro";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import sitemap from "@astrojs/sitemap";

// @deno/astro-adapter has no staticHeaders support (see the filed issue), so
// server.ts can't ask the adapter which routes were prerendered. `pages` here
// is exactly the static/prerendered output — the same list @astrojs/sitemap
// above relies on — so record it as a small manifest server.ts can read at
// startup instead of hardcoding a path list there.
const prerenderedRoutesManifest = {
  name: "prerendered-routes-manifest",
  hooks: {
    /** @param {BuildDoneParams} params */
    "astro:build:done": ({ pages, dir }) => {
      const outPath = fileURLToPath(
        new URL("../prerendered-routes.json", dir),
      );
      writeFileSync(
        outPath,
        JSON.stringify(pages.map((p) => p.pathname === "" ? "/" : p.pathname)),
      );
    },
  },
};

let startStatus = {};
if (import.meta.env.MODE === "development") {
  startStatus = { start: false };
}

// https://astro.build/config
export default defineConfig({
  adapter: deno(startStatus),
  integrations: [
    clerk(),
    react(),
    sitemap({
      // /blog/* routes are rendered on demand, so the sitemap integration
      // can't discover them by crawling static build output; they publish
      // their own sitemap fragment instead (see src/pages/sitemap-blog.xml.ts).
      customSitemaps: ["https://kanby.ai/sitemap-blog.xml"],
    }),
    prerenderedRoutesManifest,
  ],

  output: "server",

  fonts: [{
    provider: fontProviders.google(),
    name: "Cherry Bomb One",
    cssVariable: "--font-cherry-bomb-one",
    weights: ["400"],
    styles: ["normal"],
  }, {
    provider: fontProviders.google(),
    name: "Roboto Slab",
    cssVariable: "--font-roboto-slab",
    weights: ["100 900"],
    styles: ["normal", "italic"],
  }, {
    provider: fontProviders.google(),
    name: "Nunito",
    cssVariable: "--font-nunito",
    weights: ["200 1000"],
  }, {
    provider: fontProviders.google(),
    name: "Inter",
    cssVariable: "--font-inter",
    weights: ["100 900"],
    styles: ["normal", "italic"],
  }],

  site: "https://kanby.ai",

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
  },
});
