import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import dayjs from "dayjs";
import siteDefaultImage from "./images/site-default.png";

// this exists thanks to zod not having a great way to fetch defaults.
// we want to prevent content from getting displayed if it's empty while keeping sane syntax
export function isEmpty(e: unknown): boolean {
  switch (true) {
    case e === "":
      // console.debug('isEmpty: empty because of "" check')
    case e === 0:
      // console.debug('isEmpty: empty because of 0 check')
    case e === "0":
      // console.debug('isEmpty: empty because of "0" check')
    case e === null:
      // console.debug('isEmpty: empty because of null check')
    case e === false:
      // console.debug('isEmpty: empty because of false check')
    case e === undefined:
      // console.debug('isEmpty: empty because of undefined check')
    case Array.isArray(e) && e.length === 0: // check if array is empty
      // console.debug('isEmpty: empty because of e.length check')
    case Array.isArray(e) && (e.join("") === "" || e.join("") === "0"): // check if array only holds empty values
      // console.debug('isEmpty: empty because of [""]||[0] check')
    case e instanceof Object && Object.keys(e).length === 0: // check if object is empty
      // console.debug('isEmpty: empty because of object check')
      return true;
    default:
      return false;
  }
}

const _datelike = z.union([z.number(), z.string(), z.date()]);
const _datelikeToDate = _datelike.pipe(z.coerce.date()).transform(
  (v) => isEmpty(v) ? undefined : dayjs(v).toISOString(),
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
  src: z.string().url(),
  alt: z.string().optional().nullable(),
});

export type Image = z.infer<typeof _image>;

const _author = z.string().default("Kanby Team").transform((value) =>
  value.trim()
);

export const SITENAME = "Kanby";
const DEFAULT_SITE_IMAGE = new URL(siteDefaultImage.src, "https://kanby.ai")
  .href;

// seo metadata that can be applied to most components
const _minimumComponentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  images: z.array(_image).default([{
    src: DEFAULT_SITE_IMAGE,
    alt: "Kanby",
  }]),
});

export const anyPageSchema = _minimumComponentSchema.extend({
  type: z.string().default("website"),
  video: z.string().url().optional().nullable(),
});

export type AnyPageMetadata = z.infer<typeof anyPageSchema>;
export type MinimumComponentMetadata = z.infer<typeof _minimumComponentSchema>;

export const twitterCardSchema = z.object({
  card: z.enum(["summary", "summary_large_image", "app", "player"]).default(
    "summary",
  ),
  site: z.string().default("@richvsyou"),
  creator: z.string().default("@richvsyou"),
})
  .merge(_minimumComponentSchema.partial());

export type TwitterCard = z.infer<typeof twitterCardSchema>;

const _blogSchema = z.object({
  publishedTime: _datelikeToDate,
  modifiedTime: _datelikeToDate.optional().nullable(),
  expirationTime: _datelikeToDate.optional().nullable(),
  tags: _tags.optional(),
  author: _author,
})
  .merge(_minimumComponentSchema);

export const articleSchema = _blogSchema.partial().extend({
  section: z.string().optional().default("Politics"),
});

export type blogArticle = z.infer<typeof _blogSchema>;
export type Article = z.infer<typeof articleSchema>;

// set things up this way so you can easily override seo defaults via the frontmatter
export const frontmatterMetadataSchema = z.object({
  canonical: z.string().url().optional(),
  robots: z.object({
    noindex: z.boolean().optional(),
    nofollow: z.boolean().optional(),
  }).optional(),
  twitter: twitterCardSchema.optional(),
  article: articleSchema.optional(),
});

export type FrontmatterMetadataSchema = z.infer<
  typeof frontmatterMetadataSchema
>;

// shared prop shape for the `seo` prop passed to BaseLayout/HtmlHead/SEO —
// Partial<AnyPageMetadata> because callers may pass plain {title, description}
// literals without images/type, not just full collection entry data.
export type SeoMetadata = Partial<AnyPageMetadata> & {
  metadata?: FrontmatterMetadataSchema;
};

// article-specific seo metadata
export const blogCollectionSchema = z.object({
  draft: z.boolean().default(true),
  testOnly: z.boolean().default(false),
  type: z.string().default("article"),
  metadata: frontmatterMetadataSchema.optional(),
})
  // add in the fields that enable seo metadata anywhere on the website
  .merge(_minimumComponentSchema)
  // add in the fields that are required by blog articles
  .merge(_blogSchema);

export type BlogCollectionMetadata = z.infer<typeof blogCollectionSchema>;

const blogCollection = defineCollection({
  loader: glob({ pattern: ["*.md", "*.mdx"], base: "./src/data/blog" }),
  schema: blogCollectionSchema,
});

export const collections = {
  blog: blogCollection,
};
