// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";
import deno from "@deno/astro-adapter";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import clerk from "@clerk/astro";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";

const { TESTING } = loadEnv(Deno.env.get("TESTING"), Deno.cwd(), "");

// https://astro.build/config
export default defineConfig({
  adapter: deno(),
  env: {
    schema: {
      TESTING: envField.string({
        context: "server",
        access: "secret",
        optional: false,
        default: TESTING,
      }),
    },
    validateSecrets: true,
  },
  integrations: [
    clerk(),
    react(),
    sitemap({
      // /blog/* routes are rendered on demand, so the sitemap integration
      // can't discover them by crawling static build output; they publish
      // their own sitemap fragment instead (see src/pages/sitemap-blog.xml.ts).
      customSitemaps: ["https://kanby.ai/sitemap-blog.xml"],
      filter: (page) =>
        page !== "https://example.com/build/" &&
        page !== "https://example.com/ssr/",
    }),
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
