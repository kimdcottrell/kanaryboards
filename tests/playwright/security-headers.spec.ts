/// <reference lib="dom" />
import process from "node:process";
import { expect, testNoClerk as test } from "./fixtures.ts";
import type { Page } from "@playwright/test";

// A "malicious user" suite: it attempts the attacks the security headers in
// src/middleware.ts are meant to stop, and proves the headers respond.
//
// These headers only exist in a production build (they are gated behind
// `import.meta.env.PROD`), so this file is run against a `build` + `preview`
// server via `deno task e2e-security` — never the dev server. It is excluded
// from the normal suite (playwright.config.ts `testIgnore`) and self-skips unless
// MODE=development so it can only run locally.
//
// CSP currently ships as Content-Security-Policy-Report-Only, which REPORTS but
// does not block. The CSP tests therefore assert on the violation *report*
// (disposition "report" now, "enforce" after the CSP_REPORT_ONLY flip) rather
// than on a hard block, so they stay correct across that change.

const BASE = process.env.BASE_URL ?? "http://localhost:8085";

// A host that appears in no CSP allowlist. example.com is IANA-reserved, so this
// never accidentally matches a real allowed source.
const EVIL = "https://evil.example.com";

type Violation = {
  directive: string;
  blockedURI: string;
  disposition: string;
};

type Attack = {
  kind: "script" | "img" | "object" | "base" | "fetch";
  url: string;
};

// Navigate to a real page, listen for CSP violations, perform one attacker
// injection, and return whatever the browser reported. No eval() is used (the
// CSP has no 'unsafe-eval'), so nothing here pollutes the reported violations.
async function collectViolations(
  page: Page,
  attack: Attack,
): Promise<Violation[]> {
  await page.goto("/");
  return await page.evaluate(async (a) => {
    const out: Violation[] = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      out.push({
        directive: e.effectiveDirective,
        blockedURI: e.blockedURI,
        disposition: e.disposition,
      });
    });
    switch (a.kind) {
      case "script": {
        const s = document.createElement("script");
        s.src = a.url;
        document.head.appendChild(s);
        break;
      }
      case "img": {
        const i = document.createElement("img");
        i.src = a.url;
        document.body.appendChild(i);
        break;
      }
      case "object": {
        const o = document.createElement("object");
        o.data = a.url;
        document.body.appendChild(o);
        break;
      }
      case "base": {
        const b = document.createElement("base");
        b.href = a.url;
        document.head.appendChild(b);
        break;
      }
      case "fetch": {
        try {
          await fetch(a.url);
        } catch {
          // Blocked (enforce) or a network error (report-only) — either way the
          // securitypolicyviolation event has already fired.
        }
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
    return out;
  }, attack);
}

// Chromium reports script/style element blocks as "script-src-elem"/"style-src-elem"
// even when only "script-src" is configured, so match on prefix. Assert the
// violation names our evil host and carries a valid disposition.
function expectViolation(
  violations: Violation[],
  directivePrefix: string,
): Violation {
  const v = violations.find(
    (x) =>
      x.directive.startsWith(directivePrefix) &&
      x.blockedURI.includes("evil.example.com"),
  );
  expect(
    v,
    `expected a ${directivePrefix} violation for ${EVIL}; got ${
      JSON.stringify(violations)
    }`,
  ).toBeTruthy();
  expect(["report", "enforce"]).toContain(v!.disposition);
  return v!;
}

test.describe("security headers block a malicious user", () => {
  test.skip(
    process.env.MODE !== "development",
    "Security-header e2e is local-only; run `deno task e2e-security` against a prod build+preview.",
  );

  test("all six security headers are present with the expected values", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();

    expect(h["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(h["x-frame-options"]).toBe("SAMEORIGIN");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("geolocation=()");

    // CSP is present either enforced or report-only.
    const csp = h["content-security-policy"] ??
      h["content-security-policy-report-only"];
    expect(csp, "a Content-Security-Policy header should be present")
      .toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  test("clickjacking: a cross-origin page cannot frame the site", async ({ page }) => {
    const refusals: string[] = [];
    page.on("console", (msg) => {
      const t = msg.text();
      if (
        /Refused to (display|frame)/i.test(t) &&
        /(X-Frame-Options|frame-ancestors)/i.test(t)
      ) {
        refusals.push(t);
      }
    });

    // The current page is an opaque-origin about:blank, i.e. cross-origin to the
    // site — exactly an attacker's framing page.
    await page.setContent(
      `<h1>totally-legit-site</h1><iframe src="${BASE}/"></iframe>`,
    );
    await page.waitForTimeout(3000);

    expect(
      refusals,
      "the browser should refuse to frame the site (X-Frame-Options / frame-ancestors)",
    ).not.toHaveLength(0);
  });

  test("XSS: an injected external script is caught by script-src", async ({ page }) => {
    const violations = await collectViolations(page, {
      kind: "script",
      url: `${EVIL}/xss.js`,
    });
    expectViolation(violations, "script-src");
  });

  test("exfiltration: fetch() to a foreign host is caught by connect-src", async ({ page }) => {
    const violations = await collectViolations(page, {
      kind: "fetch",
      url: `${EVIL}/steal`,
    });
    expectViolation(violations, "connect-src");
  });

  test("tracking: an injected image beacon is caught by img-src", async ({ page }) => {
    const violations = await collectViolations(page, {
      kind: "img",
      url: `${EVIL}/pixel.gif`,
    });
    expectViolation(violations, "img-src");
  });

  test("base-tag hijack: an injected <base> is caught by base-uri", async ({ page }) => {
    const violations = await collectViolations(page, {
      kind: "base",
      url: `${EVIL}/`,
    });
    expectViolation(violations, "base-uri");
  });

  test("plugin injection: an <object> is caught by object-src 'none'", async ({ page }) => {
    const violations = await collectViolations(page, {
      kind: "object",
      url: `${EVIL}/evil.swf`,
    });
    expectViolation(violations, "object-src");
  });

  test("geolocation is disabled by Permissions-Policy", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(() =>
      new Promise<string>((resolve) => {
        if (!("geolocation" in navigator)) return resolve("no-api");
        navigator.geolocation.getCurrentPosition(
          () => resolve("allowed"),
          (err) => resolve(`blocked:${err.code}`),
          { timeout: 3000 },
        );
      })
    );
    expect(result).not.toBe("allowed");
  });

  // Documents a deliberate tradeoff, not a gap in the tests: script-src includes
  // 'unsafe-inline' (Clerk's requirement), so an inline script still runs and is
  // NOT reported. This guards against anyone assuming inline XSS is blocked.
  test("known tradeoff: inline scripts run and are NOT reported ('unsafe-inline')", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const violations: string[] = [];
      document.addEventListener(
        "securitypolicyviolation",
        (e) => violations.push(e.effectiveDirective),
      );
      (globalThis as Record<string, unknown>).__xssRan = false;
      const s = document.createElement("script");
      s.textContent = "globalThis.__xssRan = true;";
      document.head.appendChild(s);
      await new Promise((r) => setTimeout(r, 300));
      return {
        ran: (globalThis as Record<string, unknown>).__xssRan as boolean,
        violations,
      };
    });
    expect(result.ran, "inline scripts execute under 'unsafe-inline'").toBe(
      true,
    );
    expect(
      result.violations,
      "inline scripts are not reported under 'unsafe-inline'",
    ).toHaveLength(0);
  });
});
