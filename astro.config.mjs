// @ts-check
import { defineConfig } from "astro/config";
import deno from "@deno/astro-adapter";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  adapter: deno(),

  integrations: [react()],

  output: "server",

  security: {
    checkOrigin: false,
  },

  server: {
    port: 4321,
    host: "0.0.0.0",
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
