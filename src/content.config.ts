import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogCollectionSchema } from "@lib/seo-schema.ts";

const blogCollection = defineCollection({
  loader: glob({ pattern: ["*.md", "*.mdx"], base: "./src/data/blog" }),
  schema: blogCollectionSchema,
});

export const collections = {
  blog: blogCollection,
};
