// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";

import SEO from "@components/seo/SEO.astro";
import baseLayoutSource from "@layouts/BaseLayout.astro?raw";
import htmlHeadSource from "@layouts/partials/HtmlHead.astro?raw";

const EXPECTED_TITLE =
  "Kanby | Discover what can be with Kanby: task management software that works FOR you, not to replace you";
const EXPECTED_DESCRIPTION =
  "Task management software written by people who have had to use it. Kanby is here to help you, not replace you. Whether you're planning a project, organizing your day, feeling overwhelmed with decision fatigue, or confused on where to start, Kanby is the tool you need to stay organized and focused.";
const EXPECTED_OG_TITLE =
  "Discover what can be with Kanby: task management software that works FOR you, not to replace you";

describe("SEO fallback metadata", () => {
  test("renders default title, description, and Open Graph tags when no seo prop is provided", async () => {
    const container = await AstroContainer.create();

    const result = await container.renderToString(SEO, {
      request: new Request("http://kanby.ai/"),
    });

    expect(result).toContain(`<title>${EXPECTED_TITLE}</title>`);
    expect(result).toContain(
      `<meta name="description" property="og:description" content="${EXPECTED_DESCRIPTION}">`,
    );
    expect(result).toContain(
      '<meta property="og:url" content="http://kanby.ai/">',
    );
    expect(result).toContain('<meta property="og:type" content="website">');
    expect(result).toContain(
      `<meta property="og:title" content="${EXPECTED_OG_TITLE}">`,
    );

    const ogImageMatch = result.match(
      /<meta name="og:image" content="([^"]+)">/,
    );
    expect(ogImageMatch).not.toBeNull();
    expect(ogImageMatch?.[1]).toContain("site-default");
  });
});

describe("SEO wiring", () => {
  test("BaseLayout renders HtmlHead, which renders SEO", () => {
    expect(baseLayoutSource).toMatch(
      /import\s+HtmlHead\s+from\s+["']\.\/partials\/HtmlHead\.astro["']/,
    );
    expect(baseLayoutSource).toMatch(/<HtmlHead\s+seo={seo}\s*\/>/);

    expect(htmlHeadSource).toMatch(
      /import\s+SEO\s+from\s+["']@components\/seo\/SEO\.astro["']/,
    );
    expect(htmlHeadSource).toMatch(/<SEO\s+seo={seo}\s*\/>/);
  });
});
