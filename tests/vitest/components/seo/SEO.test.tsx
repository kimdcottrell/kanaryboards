// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";

import HtmlHead from "@layouts/partials/HtmlHead.astro";

const EXPECTED_TITLE =
  "Kanby | Discover what can be with Kanby: task management software written by people who have had to use it";
const EXPECTED_DESCRIPTION =
  "Whether you're planning a project, organizing your day, feeling overwhelmed with decision fatigue, or confused on where to start, Kanby is the tool you need to stay organized and focused.";
const EXPECTED_OG_TITLE =
  "Discover what can be with Kanby: task management software written by people who have had to use it";

describe("SEO fallback metadata", () => {
  test("renders default title, description, and Open Graph tags when no seo prop is provided", async () => {
    const container = await AstroContainer.create();

    const result = await container.renderToString(HtmlHead, {
      request: new Request("http://kanby.ai/"),
    });

    expect(result).toContain(`<title>${EXPECTED_TITLE}</title>`);
    expect(result).toContain(
      `<meta name="description" content="${EXPECTED_DESCRIPTION}">`,
    );
    expect(result).toContain(
      '<meta property="og:url" content="http://kanby.ai/">',
    );
    expect(result).toContain('<meta property="og:type" content="website">');
    expect(result).toContain(
      `<meta property="og:title" content="${EXPECTED_OG_TITLE}">`,
    );

    const ogImageMatch = result.match(
      /<meta property="og:image" content="([^"]+)">/,
    );
    expect(ogImageMatch).not.toBeNull();
    expect(ogImageMatch?.[1]).toContain("site-default");
  });

  test("renders site-wide Twitter Card defaults when no seo prop is provided", async () => {
    const container = await AstroContainer.create();

    const result = await container.renderToString(HtmlHead, {
      request: new Request("http://kanby.ai/"),
    });

    expect(result).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
    expect(result).toContain('<meta name="twitter:site" content="@kanbyai">');
    expect(result).toContain(
      '<meta name="twitter:creator" content="@kanbyai">',
    );
  });

  test("renders sitewide Organization and WebSite JSON-LD", async () => {
    const container = await AstroContainer.create();

    const result = await container.renderToString(HtmlHead, {
      request: new Request("http://kanby.ai/"),
    });

    const jsonLdBlocks = [
      ...result.matchAll(
        /<script type="application\/ld\+json">(.*?)<\/script>/g,
      ),
    ].map((match) => JSON.parse(match[1]));

    expect(
      jsonLdBlocks.some((block) => block["@type"] === "Organization"),
    ).toBe(true);
    expect(jsonLdBlocks.some((block) => block["@type"] === "WebSite")).toBe(
      true,
    );
  });
});
