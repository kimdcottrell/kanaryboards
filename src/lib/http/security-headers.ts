// --- Security response headers ----------------------------------------------
// Applied to on-demand rendered responses (via src/middleware.ts) and to
// prerendered/static responses (via server.ts) in production only. Kept out
// of dev so localhost isn't pinned to HTTPS by HSTS, and Vite HMR / Clerk dev
// mode (which need eval + websockets) aren't tripped up by the CSP.
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

export const securityHeaders: Record<string, string> = {
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
