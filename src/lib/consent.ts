import type { ConsentRecord } from "@policystack/core/consent";

// Single source of truth for the consent cookie's name. The client-side
// `cookieAdapter` (CookieBanner.astro) writes to it; the server reads it here to
// (a) render the banner hidden for returning visitors and (b) set the correct
// Google Consent Mode default before gtag loads.
export const CONSENT_COOKIE = "cookie_consent";

// @policystack/core's cookie adapter stores the ConsentRecord as base64url-encoded
// JSON (see dist/consent/storage/cookie.js `encode`). Mirror its `decode` so we can
// read the decision server-side.
export function parseConsentCookie(
  value: string | undefined,
): ConsentRecord | null {
  if (!value) return null;
  try {
    const b64 = (value + "=".repeat((4 - (value.length % 4)) % 4))
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    return JSON.parse(atob(b64)) as ConsentRecord;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(value: string | undefined): boolean {
  return parseConsentCookie(value)?.decisions?.analytics === true;
}
