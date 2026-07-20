// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import deno from "@deno/astro-adapter";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import clerk from "@clerk/astro";
import sitemap from "@astrojs/sitemap";

let site = "";

switch (import.meta.env.MODE) {
  case "production":
    site = "https://kanby.ai";
    break;
  case "development":
    site = "https://kanary.local.dev";
    break;
  default:
    site = `https://kanby-${
      Deno.env.get("DENO_DEPLOY_BUILD_ID")
    }.kimdcottrell.deno.net`;
}

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
  },
});
