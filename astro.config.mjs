// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({

  integrations: [preact({ devtools: true, compat: true })],

  server: {
    port: 4321,
    host: "0.0.0.0",
  },

  vite: {
    plugins: [tailwindcss()],
  },

});