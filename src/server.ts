// Custom production/preview server, replacing @deno/astro-adapter's
// auto-started one (astro.config.mjs sets `adapter: deno({ start: false })`).
//
// The adapter's exported `handle()` only does `app.render(request)` — it has
// no static-file serving, so prerendered pages (src/pages/index.astro,
// privacy.astro, contact.astro, cookies.astro) and built assets are served
// here directly from dist/client, with the same security headers
// src/middleware.ts applies to on-demand responses. Static file requests
// never run Astro middleware, so without this they'd ship with none of it.
// @ts-ignore -- astro check's tsc has no knowledge of deno.jsonc's JSR
// import map, so it can't resolve this specifier even though `deno run` and
// `deno check` do.
import { serveDir } from "@std/http/file-server";
import { securityHeaders } from "./lib/http/security-headers.ts";
import { PUBLIC_CACHE_CONTROL } from "./lib/http/cache-headers.ts";

// astro.config.mjs's prerenderedRoutesManifest integration writes this at
// build time from the same `astro:build:done` `pages` list @astrojs/sitemap
// uses — @deno/astro-adapter has no staticHeaders support (see the filed
// issue), so this is how we find out which routes were prerendered without
// hardcoding a path list here.
export function canonicalPath(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, "");
}

export interface RequestHandlerOptions {
  prerenderedPaths: Set<string>;
  handle: (req: Request) => Response | Promise<Response>;
  fsRoot?: string;
  serveStatic?: typeof serveDir;
}

// Extracted from the Deno.serve callback below so tests can exercise the
// routing/header logic directly, without booting a real listener or
// depending on a prior `dist/` build. `handle` is required rather than
// defaulted to a `dist/server/entry.mjs` import so that importing this
// module never requires a build to already exist.
export function createRequestHandler({
  prerenderedPaths,
  handle,
  fsRoot = "./dist/client",
  serveStatic = serveDir,
}: RequestHandlerOptions) {
  return async function handleRequest(req: Request): Promise<Response> {
    // serveDir returns 405 (not 404) for any non-GET/HEAD method, before ever
    // checking whether the path matches a file — so without this guard, every
    // POST/PUT/DELETE (contact form, task/checklist generation, board saves)
    // would be swallowed as "handled" by the static server and never reach
    // the SSR handler below.
    const staticResp = req.method === "GET" || req.method === "HEAD"
      ? await serveStatic(req, { fsRoot, quiet: true })
      : new Response(null, { status: 404 });
    if (staticResp.status !== 404) {
      // serveDir returns some responses (e.g. trailing-slash redirects) with
      // spec-immutable headers, so copy into a fresh mutable Headers instead
      // of mutating in place.
      const headers = new Headers(staticResp.headers);
      for (const [name, value] of Object.entries(securityHeaders)) {
        headers.set(name, value);
      }
      // Astro.response.headers set in a prerendered page's frontmatter never
      // reaches the built file (see the filed staticHeaders issue) — set
      // Cache-Control here instead, where we control the real response.
      if (prerenderedPaths.has(canonicalPath(new URL(req.url).pathname))) {
        headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
      }
      return new Response(staticResp.body, {
        status: staticResp.status,
        statusText: staticResp.statusText,
        headers,
      });
    }
    // Dynamic/SSR routes, API routes, and Astro's own 404 page — already
    // carries security headers via src/middleware.ts.
    return handle(req);
  };
}

if (import.meta.main) {
  // @ts-ignore -- dist/server/entry.mjs is a build output, so it doesn't
  // exist when `astro check` runs (pre-commit, CI) against a fresh checkout.
  const { handle } = await import("../dist/server/entry.mjs");
  const port = Number(Deno.env.get("PORT") ?? 8085);
  const hostname = "0.0.0.0";
  const prerenderedPaths = new Set<string>(
    JSON.parse(await Deno.readTextFile("./dist/prerendered-routes.json"))
      .map(canonicalPath),
  );

  Deno.serve(
    { port, hostname },
    createRequestHandler({ prerenderedPaths, handle }),
  );

  console.log(`Server running on port ${port}`);
}
