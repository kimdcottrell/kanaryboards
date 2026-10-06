// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";

import GoogleAnalytics from "@components/seo/partials/GoogleAnalytics.astro";

// The consent mapping runs in the browser (define:vars), so execute the rendered
// inline script against a stubbed window and return the gtag calls it made.
async function renderGtagCalls(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(GoogleAnalytics, { props });
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
  const window: { dataLayer?: IArguments[] } = {};
  new Function("window", script)(window);
  return (window.dataLayer ?? []).map((args) => Array.from(args));
}

describe("GoogleAnalytics", () => {
  test("renders with the required tag prop", async () => {
    const container = await AstroContainer.create();

    const testTag = "GT-TEST123";

    const result = await container.renderToString(GoogleAnalytics, {
      props: { tag: testTag },
    });

    expect(result).toContain(
      `https://www.googletagmanager.com/gtag/js?id=${testTag}`,
    );
    expect(await renderGtagCalls({ tag: testTag })).toContainEqual([
      "config",
      testTag,
    ]);
  });

  test("throws an error when the tag prop is missing", async () => {
    const container = await AstroContainer.create();

    await expect(
      container.renderToString(GoogleAnalytics, { props: {} }),
    ).rejects.toThrow("GoogleTag is missing");
  });

  test("grants analytics_storage when analyticsConsent is true", async () => {
    const calls = await renderGtagCalls({
      tag: "GT-TEST123",
      analyticsConsent: true,
    });

    expect(calls).toContainEqual([
      "consent",
      "default",
      expect.objectContaining({ analytics_storage: "granted" }),
    ]);
  });

  test("denies analytics_storage when analyticsConsent is false", async () => {
    const calls = await renderGtagCalls({
      tag: "GT-TEST123",
      analyticsConsent: false,
    });

    expect(calls).toContainEqual([
      "consent",
      "default",
      expect.objectContaining({ analytics_storage: "denied" }),
    ]);
  });

  test("denies analytics_storage by default when analyticsConsent is omitted", async () => {
    const calls = await renderGtagCalls({ tag: "GT-TEST123" });

    expect(calls).toContainEqual([
      "consent",
      "default",
      expect.objectContaining({ analytics_storage: "denied" }),
    ]);
  });

  test("always denies advertising signals", async () => {
    const calls = await renderGtagCalls({
      tag: "GT-TEST123",
      analyticsConsent: true,
    });

    expect(calls).toContainEqual([
      "consent",
      "default",
      expect.objectContaining({
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      }),
    ]);
  });
});
