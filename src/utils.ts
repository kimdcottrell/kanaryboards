import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

export async function getProtectedCollection(
  key: "blog",
  { requireTags = true } = {},
) {
  return await getCollection(key, ({ data }) => {
    let returnable = true;
    // we allow for blog posts to be created without tags in content.config.js
    // sometimes, we might want to include those posts
    if (requireTags) {
      if (!data.tags) returnable = false;
    }
    if (import.meta.env.MODE === "production" && data.draft === true) {
      returnable = false;
    }
    return returnable;
  });
}

export function getTagsFromCollection(collection: CollectionEntry<"blog">[]) {
  return [
    ...new Set(collection.map((post) => post.data.tags).flat()),
  ];
}
