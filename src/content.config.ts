import { defineCollection, z } from "astro:content";
import { DEFAULT_SITE_IMAGE, SITENAME } from "astro:env/client";
import { glob } from "astro/loaders";
import dayjs from "dayjs";

// this exists thanks to zod not having a great way to fetch defaults.
// we want to prevent content from getting displayed if it's empty while keeping sane syntax
export function isEmpty(e: any): boolean {
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

const _author = z.string().default(SITENAME);

// seo metadata that can be applied to most components
const _minimumComponentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  images: z.array(_image).default([{
    src: DEFAULT_SITE_IMAGE,
    alt: SITENAME,
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

const _newsSchema = z.object({
  publishedTime: _datelikeToDate,
  modifiedTime: _datelikeToDate.optional().nullable(),
  expirationTime: _datelikeToDate.optional().nullable(),
  tags: _tags.optional(),
  author: _author,
})
  .merge(_minimumComponentSchema);

export const articleSchema = _newsSchema.partial().extend({
  section: z.string().optional().default("Politics"),
});

export type NewsArticle = z.infer<typeof _newsSchema>;
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

// article-specific seo metadata
export const newsCollectionSchema = z.object({
  draft: z.boolean().default(true),
  type: z.string().default("article"),
  metadata: frontmatterMetadataSchema.optional(),
})
  // add in the fields that enable seo metadata anywhere on the website
  .merge(_minimumComponentSchema)
  // add in the fields that are required by news articles
  .merge(_newsSchema);

export type NewsCollectionMetadata = z.infer<typeof newsCollectionSchema>;

const newsCollection = defineCollection({
  loader: glob({ pattern: ["*.md", "*.mdx"], base: "./www/src/data/news" }),
  schema: newsCollectionSchema,
});

export const collections = {
  news: newsCollection,
};
