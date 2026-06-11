// @ts-check
import { defineConfig } from "astro/config";
import deno from "@deno/astro-adapter";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import clerk from '@clerk/astro'

// https://astro.build/config
export default defineConfig({
  adapter: deno(),
  integrations: [
    clerk({
      appearance: {
        cssLayerName: 'clerk',
      },
    }),
    react()
  ],

  output: "server",

  site: "https://kanby.ai",

  server: {
    port: 4321,
    host: "0.0.0.0",
    allowedHosts: [
      "0.0.0.0",
      "localhost",
      "kanary.local.dev",
      "kanby--local.kimdcottrell.deno.net"
    ],
  },

  vite: {
    plugins: [tailwindcss()]
  },
});
