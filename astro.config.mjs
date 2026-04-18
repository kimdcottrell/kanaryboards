// @ts-check
import { defineConfig } from 'astro/config';
import deno from "@deno/astro-adapter";
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  adapter: deno(),

  integrations: [preact({ devtools: true, compat: true })],

  security: {
    checkOrigin: false
  },

  server: {
    port: 4321,
    host: "0.0.0.0",
  },

  vite: {
    plugins: [tailwindcss()],
  },

});