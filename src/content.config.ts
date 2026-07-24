import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import dayjs from "dayjs";
import siteDefaultImage from "./images/site-default.png";

const _datelike = z.union([z.number(), z.string(), z.date()]);
const _datelikeToDate = _datelike.pipe(z.coerce.date()).transform(
  (v) => dayjs(v).toISOString(),
);

const _tags = z
  .array(
    z.string()
      .min(1)
      .toLowerCase()
      .transform((value) =>
        value
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, "")
      ),
  );

const _image = z.object({
  src: z.url(),
  alt: z.string().nullish(),
});

const DEFAULT_AUTHOR = "Kim Cottrell";
const DEFAULT_AUTHOR_LINK = "https://kimdcottrell.com";

const _author = z.string().default(DEFAULT_AUTHOR).transform((value) =>
  value.trim()
);
const _authorLink = z.url().nullish();

const SITE_BASE_URL = import.meta.env.SITE;
const DEFAULT_SITE_IMAGE = new URL(siteDefaultImage.src, SITE_BASE_URL)
  .href;

const blogCollectionSchema = z.object({
  draft: z.boolean().default(true),
  testOnly: z.boolean().default(false),
  title: z.string().min(1),
  description: z.string().min(1),
  images: z.array(_image).default([{
    src: DEFAULT_SITE_IMAGE,
    alt:
      "Discover what can be with Kanby: task management software written by people who have had to use it",
  }]),
  publishedTime: _datelikeToDate,
  modifiedTime: _datelikeToDate.nullish(),
  expirationTime: _datelikeToDate.nullish(),
  tags: _tags.optional(),
  author: _author,
  authorLink: _authorLink,
  section: z.string().default("Task management"),
  // flattened SEO overrides (previously nested under `metadata:`)
  canonical: z.url().optional(),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  twitter: z.object({
    card: z.enum(["summary", "summary_large_image", "app", "player"])
      .optional(),
    site: z.string().optional(),
    creator: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    images: z.array(_image).optional(),
  }).optional(),
}).transform((data) => ({
  ...data,
  // Fall back to the default author link only when the author is also the
  // default; an overridden author with no link stays unlinked.
  authorLink: data.authorLink ??
    (data.author === DEFAULT_AUTHOR ? DEFAULT_AUTHOR_LINK : undefined),
}));

export type BlogCollectionMetadata = z.infer<typeof blogCollectionSchema>;

const blogCollection = defineCollection({
  loader: glob({ pattern: ["*.md", "*.mdx"], base: "./src/data/blog" }),
  schema: blogCollectionSchema,
});

export const collections = {
  blog: blogCollection,
};
