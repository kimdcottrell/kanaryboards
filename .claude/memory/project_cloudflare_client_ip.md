---
name: project_cloudflare_client_ip
description: Deno adapter's clientAddress is the raw TCP peer, not the real visitor IP, once kanby.ai is proxied through Cloudflare — middleware.ts now prefers CF-Connecting-IP.
metadata:
  type: project
---

kanby.ai's DNS is proxied (orange-clouded) through Cloudflare. `@deno/astro-adapter` v0.5.2 sets `context.clientAddress` directly from `handlerInfo.remoteAddr.hostname` in `Deno.serve`'s handler (`node_modules/.deno/@deno+astro-adapter@0.5.2/.../src/server.ts:48-49`) — the raw TCP connection peer, with no header-forwarding logic at all. Behind Cloudflare's proxy that peer is always Cloudflare's edge, never the actual visitor.

Fixed on 2026-07-08 in `src/middleware.ts`'s unauthorized-access `console.debug` log (used for abuse/security tracking): now reads `context.request.headers.get("CF-Connecting-IP") ?? context.clientAddress`, since Cloudflare sets `CF-Connecting-IP` to the true client IP on every proxied request. Falls back to `clientAddress` for non-proxied requests (local dev, direct `.deno.net` access).

If any other code path ever needs the real client IP (rate limiting, analytics, abuse detection), it must use this same `CF-Connecting-IP`-first pattern — `context.clientAddress` alone is not trustworthy on this deployment. See [[project_security_headers]] for the related Cloudflare CSP audit from the same session.
