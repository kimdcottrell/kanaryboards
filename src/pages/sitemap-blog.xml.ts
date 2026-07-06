import type { APIRoute } from "astro";
import { getProtectedCollection, getTagsFromCollection } from "@src/utils.ts";

export const prerender = true;

const escapeXml = (value: string) => value.replace(/&/g, "&amp;");

export const GET: APIRoute = async ({ site }) => {
  const posts = await getProtectedCollection("blog");
  const tags = getTagsFromCollection(posts);

  const urls = [
    ...posts.map((post) => new URL(`/blog/${post.id}`, site)),
    ...tags.map((tag) => new URL(`/blog/tags/${tag}`, site)),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${
    urls
      .map((url) => `  <url>\n    <loc>${escapeXml(url.href)}</loc>\n  </url>`)
      .join("\n")
  }
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};
