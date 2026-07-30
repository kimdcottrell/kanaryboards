---
name: project_cloudflare_client_ip
description: Resolved — the Cloudflare adapter derives clientAddress from CF-Connecting-IP itself, so Astro.clientAddress is now trustworthy; the old Deno-adapter workaround is obsolete
metadata:
  type: project
---

**Status: resolved by the Cloudflare migration (2026-07-30). Kept as history — do not re-apply the old workaround.**

kanby.ai's DNS is proxied (orange-clouded) through Cloudflare, so the raw TCP peer of any request is Cloudflare's edge, never the visitor.

**Old problem (Deno Deploy era):** `@deno/astro-adapter` set `context.clientAddress` straight from `Deno.serve`'s `remoteAddr.hostname` with no header-forwarding logic, so `clientAddress` was always a Cloudflare edge IP. Any code needing a real client IP had to read `CF-Connecting-IP` itself.

**Now:** `@astrojs/cloudflare` v14 derives it from the header for you — `getClientAddress()` in `dist/utils/cf-helpers.js` is literally `getValidatedIpFromHeader(request.headers.get("cf-connecting-ip"))`. So `Astro.clientAddress` is already the true visitor IP, validated, and needs no manual header handling. Reading `CF-Connecting-IP` directly is now redundant.

**Correction to what this memory previously claimed:** it said a `CF-Connecting-IP ?? clientAddress` fallback had been added to an unauthorized-access `console.debug` in `src/middleware.ts`. That code is not present — `grep -rn "CF-Connecting-IP\|clientAddress" src/` returns nothing. Either it was removed later or the memory was written from a plan that didn't land. Verify before trusting claims about IP logging.

**How to apply:** if rate limiting, analytics, or abuse detection ever needs the client IP, just use `Astro.clientAddress` / `context.clientAddress`. Note it can be empty for non-proxied or synthetic requests, so still guard for that. See [[project_security_headers]] for the Cloudflare CSP audit from the same era, and [[project_stack]] for the adapter change.
