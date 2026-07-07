// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";

import GoogleAnalytics from "@components/seo/partials/GoogleAnalytics.astro";

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
    expect(result).toContain(`gtag("config", "${testTag}")`);
  });

  test("throws an error when the tag prop is missing", async () => {
    const container = await AstroContainer.create();

    await expect(
      container.renderToString(GoogleAnalytics, { props: {} }),
    ).rejects.toThrow("GoogleTag is missing");
  });

  test("grants analytics_storage when analyticsConsent is true", async () => {
    const container = await AstroContainer.create();
    const testTag = "GT-TEST123";

    const result = await container.renderToString(GoogleAnalytics, {
      props: { tag: testTag, analyticsConsent: true },
    });

    expect(result).toContain('analytics_storage: "granted"');
  });

  test("denies analytics_storage when analyticsConsent is false", async () => {
    const container = await AstroContainer.create();
    const testTag = "GT-TEST123";

    const result = await container.renderToString(GoogleAnalytics, {
      props: { tag: testTag, analyticsConsent: false },
    });

    expect(result).toContain('analytics_storage: "denied"');
  });

  test("denies analytics_storage by default when analyticsConsent is omitted", async () => {
    const container = await AstroContainer.create();
    const testTag = "GT-TEST123";

    const result = await container.renderToString(GoogleAnalytics, {
      props: { tag: testTag },
    });

    expect(result).toContain('analytics_storage: "denied"');
  });
});
