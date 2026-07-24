import type { Page } from "@playwright/test";
import { expect, testNoClerk as test } from "./fixtures.ts";

async function getJsonLd(page: Page) {
  const scripts = await page.locator('script[type="application/ld+json"]')
    .all();
  return Promise.all(
    scripts.map(async (el) => JSON.parse(await el.innerHTML())),
  );
}

test.describe("Blog", () => {
  test.describe("index", () => {
    test("lists the blog articles", async ({ page }) => {
      await page.goto("/blog");

      await expect(
        page.getByRole("link", { name: "Testing", exact: true }),
      ).toHaveAttribute("href", "/blog/test");
      await expect(
        page.getByRole("link", { name: "Test 2", exact: true }),
      ).toHaveAttribute("href", "/blog/test2");
    });

    test("clicking an article link navigates to the individual article", async ({ page }) => {
      await page.goto("/blog");

      await page.getByRole("link", { name: "Testing", exact: true }).click();
      await expect(page).toHaveURL("/blog/test");
      await expect(
        page.getByRole("heading", { name: "My First Blog Post" }),
      ).toBeVisible();

      await page.goto("/blog");
      await page.getByRole("link", { name: "Test 2", exact: true }).click();
      await expect(page).toHaveURL("/blog/test2");
      await expect(
        page.getByRole("heading", { name: "My Second Blog Post" }),
      ).toBeVisible();
    });
  });

  test.describe("SEO metadata", () => {
    test("defaults populate correctly when frontmatter omits optional SEO fields", async ({ page }) => {
      await page.goto("/blog/test2");

      await expect(page).toHaveTitle("Kanby | Test 2");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        "This is the second Astro blog post",
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        page.url(),
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "index, follow",
      );

      await expect(
        page.locator('meta[property="og:image"]').first(),
      ).toHaveAttribute("content", /site-default/);
      await expect(
        page.locator('meta[property="og:image:alt"]'),
      ).toHaveAttribute(
        "content",
        "Discover what can be with Kanby: task management software written by people who have had to use it",
      );

      await expect(
        page.locator('meta[property="article:published_time"]'),
      ).toHaveAttribute("content", "2024-10-07T17:34:11.000Z");
      await expect(
        page.locator('meta[property="article:modified_time"]'),
      ).toHaveCount(0);
      await expect(
        page.locator('meta[property="article:expiration_time"]'),
      ).toHaveCount(0);
      await expect(
        page.locator('meta[property="article:author"]'),
      ).toHaveAttribute("content", "Kim Cottrell");
      await expect(
        page.locator('meta[property="article:section"]'),
      ).toHaveAttribute("content", "Task management");
      await expect(
        page.locator('meta[property="article:tag"]'),
      ).toHaveAttribute("content", "testing_tag_1");

      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      await expect(page.locator('meta[name="twitter:site"]')).toHaveAttribute(
        "content",
        "@kanbyai",
      );
      await expect(
        page.locator('meta[name="twitter:creator"]'),
      ).toHaveAttribute("content", "@kanbyai");
      await expect(
        page.locator('meta[name="twitter:title"]'),
      ).toHaveAttribute("content", "Test 2");
      await expect(
        page.locator('meta[name="twitter:description"]'),
      ).toHaveAttribute("content", "This is the second Astro blog post");
      await expect(
        page.locator('meta[name="twitter:image"]'),
      ).toHaveAttribute("content", /site-default/);

      const jsonLd = await getJsonLd(page);
      expect(jsonLd).toHaveLength(3);

      const organization = jsonLd.find((item) =>
        item["@type"] === "Organization"
      );
      expect(organization?.name).toBe("Kanby");

      const website = jsonLd.find((item) => item["@type"] === "WebSite");
      expect(website?.name).toBe("Kanby");

      const blogPosting = jsonLd.find((item) =>
        item["@type"] === "BlogPosting"
      );
      expect(blogPosting?.headline).toBe("Test 2");
      expect(blogPosting?.description).toBe(
        "This is the second Astro blog post",
      );
      expect(blogPosting?.datePublished).toBe("2024-10-07T17:34:11.000Z");
      expect(blogPosting?.dateModified).toBeUndefined();
      expect(blogPosting?.expires).toBeUndefined();
      expect(blogPosting?.author).toEqual({
        "@type": "Person",
        name: "Kim Cottrell",
        url: "https://kimdcottrell.com",
      });
      expect(blogPosting?.image).toHaveLength(1);
      expect(blogPosting?.image[0]).toMatch(/site-default/);
    });

    test("overrides populate correctly when frontmatter specifies SEO fields", async ({ page }) => {
      await page.goto("/blog/test");

      await expect(page).toHaveTitle("Kanby | Testing");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        "While easy to get started, Astrowind is quite complex internally.  This page provides documentation on some of the more intricate parts.",
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://astrowind.vercel.app/astrowind-template-in-depth",
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );

      const ogImages = page.locator('meta[property="og:image"]');
      await expect(ogImages.first()).toHaveAttribute(
        "content",
        "https://docs.astro.build/assets/rose.webp",
      );
      await expect(ogImages.last()).toHaveAttribute(
        "content",
        "https://docs.astro.build/_astro/CodingInPublic.DpaYu7Qd_5sx41.webp",
      );
      const ogImageAlts = page.locator('meta[property="og:image:alt"]');
      await expect(ogImageAlts.first()).toHaveAttribute(
        "content",
        "The Astro logo on a dark background with a pink glow.",
      );
      await expect(ogImageAlts.last()).toHaveAttribute("content", "Some dude");

      await expect(
        page.locator('meta[property="article:published_time"]'),
      ).toHaveAttribute("content", "2022-07-01T13:43:23.000Z");
      await expect(
        page.locator('meta[property="article:modified_time"]'),
      ).toHaveAttribute("content", "2022-08-15T09:00:00.000Z");
      await expect(
        page.locator('meta[property="article:expiration_time"]'),
      ).toHaveAttribute("content", "2030-01-01T00:00:00.000Z");
      await expect(
        page.locator('meta[property="article:author"]'),
      ).toHaveAttribute("content", "Override Author");
      await expect(
        page.locator('meta[property="article:section"]'),
      ).toHaveAttribute("content", "Overridden Section");
      const articleTags = page.locator('meta[property="article:tag"]');
      await expect(articleTags.first()).toHaveAttribute(
        "content",
        "testing_tag_1",
      );
      await expect(articleTags.last()).toHaveAttribute(
        "content",
        "testing_tag_2",
      );

      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary",
      );
      await expect(page.locator('meta[name="twitter:site"]')).toHaveAttribute(
        "content",
        "@overridehandle",
      );
      await expect(
        page.locator('meta[name="twitter:creator"]'),
      ).toHaveAttribute("content", "@overridecreator");
      await expect(
        page.locator('meta[name="twitter:title"]'),
      ).toHaveAttribute("content", "Overridden Twitter Title");
      await expect(
        page.locator('meta[name="twitter:description"]'),
      ).toHaveAttribute("content", "Overridden Twitter description");
      await expect(
        page.locator('meta[name="twitter:image"]'),
      ).toHaveAttribute(
        "content",
        "https://docs.astro.build/assets/twitter-override.webp",
      );

      const jsonLd = await getJsonLd(page);
      const blogPosting = jsonLd.find((item) =>
        item["@type"] === "BlogPosting"
      );
      expect(blogPosting?.headline).toBe("Testing");
      expect(blogPosting?.datePublished).toBe("2022-07-01T13:43:23.000Z");
      expect(blogPosting?.dateModified).toBe("2022-08-15T09:00:00.000Z");
      expect(blogPosting?.expires).toBe("2030-01-01T00:00:00.000Z");
      expect(blogPosting?.author).toEqual({
        "@type": "Person",
        name: "Override Author",
        url: "https://example.com/override-author",
      });
      expect(blogPosting?.image).toEqual([
        "https://docs.astro.build/assets/rose.webp",
        "https://docs.astro.build/_astro/CodingInPublic.DpaYu7Qd_5sx41.webp",
      ]);
    });
  });

  test.describe("author byline", () => {
    test("default author renders as a link to the default author URL", async ({ page }) => {
      await page.goto("/blog/test2");

      const author = page.getByRole("link", { name: "Kim Cottrell" });
      await expect(author).toBeVisible();
      await expect(author).toHaveAttribute("href", "https://kimdcottrell.com");
    });

    test("overridden author with an author link renders as a link to that URL", async ({ page }) => {
      await page.goto("/blog/test");

      const author = page.getByRole("link", { name: "Override Author" });
      await expect(author).toBeVisible();
      await expect(author).toHaveAttribute(
        "href",
        "https://example.com/override-author",
      );
    });

    test("overridden author without an author link renders as plain text", async ({ page }) => {
      await page.goto("/blog/test3");

      await expect(page.getByText("Solo Writer")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Solo Writer" }),
      ).toHaveCount(0);
    });
  });

  test.describe("tags", () => {
    test("lists the tags", async ({ page }) => {
      await page.goto("/blog/tags");

      await expect(
        page.getByRole("link", { name: "testing_tag_1" }),
      ).toHaveAttribute("href", "/blog/tags/testing_tag_1");
      await expect(
        page.getByRole("link", { name: "testing_tag_2" }),
      ).toHaveAttribute("href", "/blog/tags/testing_tag_2");
    });

    test("clicking a tag filters articles to that tag", async ({ page }) => {
      await page.goto("/blog/tags");
      await page.getByRole("link", { name: "testing_tag_1" }).click();

      await expect(page).toHaveURL("/blog/tags/testing_tag_1");
      await expect(page.getByRole("link", { name: "Testing" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Test 2" })).toBeVisible();
    });

    test("tag filtering is isolated per tag", async ({ page }) => {
      await page.goto("/blog/tags/testing_tag_2");
      await expect(page.getByRole("link", { name: "Testing" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Test 2" })).toHaveCount(0);
    });

    test("clicking an article link from a tag page navigates to the individual article", async ({ page }) => {
      await page.goto("/blog/tags/testing_tag_1");
      await page.getByRole("link", { name: "Testing" }).click();

      await expect(page).toHaveURL("/blog/test");
      await expect(
        page.getByRole("heading", { name: "My First Blog Post" }),
      ).toBeVisible();
    });
  });

  test.describe("without the Playwright header", () => {
    test.use({ extraHTTPHeaders: {} });

    test("test-only fixtures are hidden from real visitors", async ({ page }) => {
      const blogIndex = await page.goto("/blog");
      expect(blogIndex?.status()).toBe(200);
      await expect(
        page.getByRole("link", { name: "Testing", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Test 2", exact: true }),
      ).toHaveCount(0);

      const tagsIndex = await page.goto("/blog/tags");
      expect(tagsIndex?.status()).toBe(200);
      await expect(
        page.getByRole("link", { name: "testing_tag_1" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "testing_tag_2" }),
      ).toHaveCount(0);

      // Note: [slug].astro sets Astro.response.status = 404 for any unknown
      // slug, but Astro's dev server doesn't reflect that in the actual HTTP
      // status (pre-existing dev-mode behavior, reproducible with any
      // nonexistent slug — not specific to testOnly filtering). Assert on the
      // content instead: the article body/title must not render.
      await page.goto("/blog/test");
      await expect(page).not.toHaveTitle("Kanby | Testing");
      await expect(
        page.getByRole("heading", { name: "My First Blog Post" }),
      ).toHaveCount(0);
    });
  });
});
