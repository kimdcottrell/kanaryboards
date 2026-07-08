import { expect, testNoClerk as test } from "./fixtures.ts";

test.describe("Blog", () => {
  test.describe("index", () => {
    test("lists the blog articles", async ({ page }) => {
      await page.goto("/blog");

      await expect(
        page.getByRole("link", { name: "Testing" }),
      ).toHaveAttribute("href", "/blog/test");
      await expect(
        page.getByRole("link", { name: "Test 2" }),
      ).toHaveAttribute("href", "/blog/test2");
    });

    test("clicking an article link navigates to the individual article", async ({ page }) => {
      await page.goto("/blog");

      await page.getByRole("link", { name: "Testing" }).click();
      await expect(page).toHaveURL("/blog/test");
      await expect(
        page.getByRole("heading", { name: "My First Blog Post" }),
      ).toBeVisible();

      await page.goto("/blog");
      await page.getByRole("link", { name: "Test 2" }).click();
      await expect(page).toHaveURL("/blog/test2");
      await expect(
        page.getByRole("heading", { name: "My Second Blog Post" }),
      ).toBeVisible();
    });
  });

  test.describe("SEO metadata", () => {
    test("reflects each article's own frontmatter", async ({ page }) => {
      await page.goto("/blog/test");
      await expect(page).toHaveTitle("Kanby | Testing");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        "While easy to get started, Astrowind is quite complex internally.  This page provides documentation on some of the more intricate parts.",
      );
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        "https://docs.astro.build/assets/rose.webp",
      );

      await page.goto("/blog/test2");
      await expect(page).toHaveTitle("Kanby | Test 2");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        "This is the second Astro blog post",
      );
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
      await expect(page.getByRole("link", { name: "Testing" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Test 2" })).toHaveCount(0);

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
