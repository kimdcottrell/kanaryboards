// import preact from "npm:@astrojs/preact";
// import tailwind from "npm:@astrojs/tailwind";

// export default {
//   integrations: [preact(), tailwind()],
// };
// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { fileURLToPath } from 'url';
import path from 'path';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
//   cacheDir: "../node_modules/.astro",
//   output: "server",
  root: "/var/dev/",

  server: {
    port: 4321,
    host: "0.0.0.0",
    // allowedHosts: ["pdl.local.dev"],
  },

//   site: 'https://pdl.local.dev',

  fonts: [
    {
      name: 'Nunito',
      cssVariable: '--font-nunito',
      provider: fontProviders.fontsource(),
    },
    {
      name: 'La Belle Aurore',
      cssVariable: '--font-la-belle-aurore',
      provider: fontProviders.fontsource(),
    }
  ],

  integrations: [preact({ devtools: true, compat: true })],

  vite: {
    plugins: [tailwindcss()],
  },
});