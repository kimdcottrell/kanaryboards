// @vitest-environment node
import { describe, expect, test } from "vitest";

import { hasAnalyticsConsent, parseConsentCookie } from "@lib/consent.ts";

function encodeCookie(record: unknown): string {
  return btoa(JSON.stringify(record))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeRecord(decisions: Record<string, boolean>) {
  return {
    schemaVersion: 1,
    decisions,
    policyVersion: "1",
    decidedAt: "2026-01-01T00:00:00.000Z",
    jurisdiction: null,
    locale: "en",
    source: "banner",
  };
}

describe("hasAnalyticsConsent", () => {
  test.each([
    [{ essential: true, analytics: true }, true],
    [{ essential: true, analytics: false }, false],
    [{ essential: true }, false],
  ])("returns %o -> %s", (decisions, expected) => {
    const cookie = encodeCookie(makeRecord(decisions));
    expect(hasAnalyticsConsent(cookie)).toBe(expected);
  });

  test("returns false when the cookie value is undefined", () => {
    expect(hasAnalyticsConsent(undefined)).toBe(false);
  });

  test("returns false for a malformed/non-base64 cookie value and does not throw", () => {
    expect(() => hasAnalyticsConsent("%%%not-valid-base64%%%")).not.toThrow();
    expect(hasAnalyticsConsent("%%%not-valid-base64%%%")).toBe(false);
  });

  test("returns false for a value that decodes but is not valid JSON", () => {
    const notJson = btoa("not json")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(hasAnalyticsConsent(notJson)).toBe(false);
  });
});

describe("parseConsentCookie", () => {
  test("returns null for an undefined value", () => {
    expect(parseConsentCookie(undefined)).toBeNull();
  });

  test("returns the decoded record for a valid encoded cookie", () => {
    const record = makeRecord({ essential: true, analytics: true });
    const cookie = encodeCookie(record);
    expect(parseConsentCookie(cookie)).toEqual(record);
  });
});
