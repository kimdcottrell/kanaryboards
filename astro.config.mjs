// @ts-check
import { defineConfig } from "astro/config";
import deno from "@deno/astro-adapter";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  adapter: deno(),

  integrations: [react()],

  security: {
    checkOrigin: false,
  },

  server: {
    port: 4321,
    host: "0.0.0.0",
    allowedHosts: ["app", "localhost"],
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
