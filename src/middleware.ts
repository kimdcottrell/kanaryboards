import { defineMiddleware, sequence } from "astro/middleware";
import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { createId } from "@lib/uuid.ts";
import { getBoardIdForUser, setBoardIdForUser } from "@lib/kv.ts";

const isProtectedRoute = createRouteMatcher(["/api/board(.*)"]);

export const protectedRequestMiddleware = clerkMiddleware(
  async (auth, context, next) => {
    const { isAuthenticated, userId } = auth();

    if (!isAuthenticated && isProtectedRoute(context.request)) {
      console.debug({
        event:
          `Unauthorized access to ${context.request.url} blocked and handled`,
        // kanby.ai is proxied through Cloudflare, so the Deno adapter's
        // clientAddress is Cloudflare's edge IP, not the visitor's. Cloudflare
        // sets CF-Connecting-IP to the real client IP on every proxied
        // request; fall back to clientAddress for non-proxied requests
        // (local dev, direct .deno.net access).
        ip: context.request.headers.get("CF-Connecting-IP") ??
          context.clientAddress,
        method: context.request.method,
        url: context.request.url,
        headers: Object.fromEntries(context.request.headers),
      });
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/dashboard?unauthorized=1",
          "x-authenticated": "false",
        },
      });
    }

    if (userId) {
      let boardId = await getBoardIdForUser(userId);
      if (!boardId) {
        boardId = createId();
        await setBoardIdForUser(userId, boardId);
      }
      context.locals.boardId = boardId;
    }

    return next();
  },
);

// --- Security response headers ----------------------------------------------
// Applied to on-demand rendered responses in production only. Kept out of dev
// so localhost isn't pinned to HTTPS by HSTS, and Vite HMR / Clerk dev mode
// (which need eval + websockets) aren't tripped up by the CSP.
//
// The Content-Security-Policy source allowlist below is what the site actually
// loads. `'unsafe-inline'` in script-src/style-src is Clerk's documented
// requirement (runtime CSS-in-JS + its injected clerk-js loader) and also
// covers the inline Google Analytics and Mailchimp scripts. Both the test
// (*.clerk.accounts.dev) and production (clerk.kanby.ai) Clerk Frontend API
// hosts are listed so promoting to a production Clerk instance doesn't break
// auth. challenges.cloudflare.com is Clerk's bot-protection (Turnstile).
// static.cloudflareinsights.com / cloudflareinsights.com cover the Web
// Analytics beacon Cloudflare's edge auto-injects into the page for this zone.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self' https://*.list-manage.com",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://s3.amazonaws.com https://*.list-manage.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.kanby.ai https://static.cloudflareinsights.com https://ajax.cloudflare.com",
  "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.clerk.accounts.dev https://clerk.kanby.ai https://clerk-telemetry.com https://cloudflareinsights.com",
  "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com https://img.clerk.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.kanby.ai",
].join("; ");

// Start report-only: the browser logs violations but blocks nothing, so a
// missed source can't break the site. Flip to `false` to enforce once the key
// flows (home, Clerk sign-up, dashboard, subscribe form, analytics) have been
// verified clean in the browser console.
const CSP_REPORT_ONLY = true;

const securityHeaders: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  [
    CSP_REPORT_ONLY
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy"
  ]: CSP,
};

const securityHeadersMiddleware = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (import.meta.env.PROD) {
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.headers.set(name, value);
    }
  }
  return response;
});

export const boardMiddleware = defineMiddleware((context, next) => {
  if (context.locals.boardId) return next();

  // Unauthenticated: reuse a pre-existing boardId cookie if present, but never
  // create one here. Setting a cookie would force a Set-Cookie on every
  // anonymous response, which prevents the homepage from being cached at the
  // edge. Anonymous board state lives in localStorage, not this cookie/KV, so
  // leaving boardId unset for new anonymous visitors is safe.
  const boardId = context.cookies.get("boardId")?.value;
  if (boardId) context.locals.boardId = boardId;
  return next();
});

export const onRequest = sequence(
  securityHeadersMiddleware,
  protectedRequestMiddleware,
  boardMiddleware,
);
