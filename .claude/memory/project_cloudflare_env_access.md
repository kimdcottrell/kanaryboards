---
name: project_cloudflare_env_access
description: Server-side env/bindings come from `import { env } from "cloudflare:workers"` — Astro.locals.runtime.env THROWS in Astro 6+, and import.meta.env silently inlines at build time
metadata:
  type: project
---

Three ways to read a server-side value on Cloudflare, only one of which is right for secrets and bindings:

| Mechanism | Behaviour |
| --- | --- |
| `import { env } from "cloudflare:workers"` | ✅ true runtime lookup. Use for all secrets and bindings. |
| `Astro.locals.runtime.env` | ❌ **throws.** Removed in Astro 6; `@astrojs/cloudflare` v14 defines it as a getter that raises `"Astro.locals.runtime.env has been removed in Astro v6"`. |
| `import.meta.env.FOO` | ⚠️ inlined by Vite **at build time**. Fine for public/build-time constants (`MODE`, `PUBLIC_*`, `GOOGLE_TAG`), wrong for runtime secrets — the value freezes into the bundle, or bakes in as `undefined` if unset at build, and the dashboard-configured secret is silently ignored. |

**Why this is a trap:** `Astro.locals.runtime.env` is what most tutorials and older docs show, and it type-checks fine because `App.Locals` is declared loosely. It builds cleanly and then throws on the first authenticated request in production. It cost a full round of rework on 2026-07-30 before `astro check` surfaced it.

`tests/vitest/pages/api-key-runtime-env.test.ts` asserts the mechanism directly against the source text (that `cloudflare:workers` is imported and `locals.runtime` is absent), because no value-based test can distinguish these three — build-time inlining and a throwing getter both look like "works locally".

**Related adapter facts:**
- `Runtime` from `@astrojs/cloudflare` is only `{ cfContext: ExecutionContext }` — bindings are *not* on locals. `src/env.d.ts` extends `App.Locals` with it for `locals.cfContext`.
- Other replacements: `Astro.locals.runtime.cf` → `Astro.request.cf`; `.caches` → the global `caches`; `.ctx` → `Astro.locals.cfContext`.
- `@clerk/astro` resolves its keys through its own `getContextEnvVar`, which tries `cloudflare:workers` env **first**, then `locals.runtime.env` inside a `try/catch` — so the throwing getter is caught and Clerk works with runtime secrets. Don't "fix" that by inlining `CLERK_SECRET_KEY` at build.
- Binding types come from `worker-configuration.d.ts` (`wrangler types`, gitignored, regenerated in CI). ⚠️ It embeds every variable *name* from a local `.env`, which is why it stays out of this public repo.

**How to apply:** in any API route, middleware, or `.astro` frontmatter needing a secret or KV binding, `import { env } from "cloudflare:workers"` at module top and read `env.X` inside the handler. Prerendered pages are the exception — env may not be available at build depending on `prerenderEnvironment`, so don't rely on it in prerendered frontmatter. See [[project_stack]] and [[project_url_routing_kv]].
