import type { AstroGlobal } from "astro";

export const PUBLIC_CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=600";

export function setPublicCache(Astro: AstroGlobal, vary?: string): void {
  Astro.response.headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  if (vary) Astro.response.headers.set("Vary", vary);
}
