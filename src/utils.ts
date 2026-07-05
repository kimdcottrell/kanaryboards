import { CollectionEntry, getCollection } from "astro:content";
import { ENV } from "astro:env/client";

export async function getProtectedCollection(
  key: string,
  { requireTags = true } = {},
) {
  return await getCollection(key, ({ data }) => {
    let returnable = true;
    // we allow for news to be created without tags in content.config.js
    // sometimes, we might want to include those posts
    if (requireTags) {
      if (!data.tags) returnable = false;
    }
    if (ENV === "PROD" && data.draft === true) {
      returnable = false;
    }
    return returnable;
  });
}

export function getTagsFromCollection(collection: CollectionEntry) {
  return [
    ...new Set(collection.map((post: any) => post.data.tags).flat()),
  ];
}
