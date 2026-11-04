import { z } from "astro/zod";

// A comment's Lexical JSON. Each comment is its own KV entry, so it must also
// stay under Deno KV's 64KiB value limit, with headroom for the other fields.
// Shared by both /api/v1/tasks/[id]/comments routes.
export const ContentSchema = z.string().min(1).refine(
  (content) => new TextEncoder().encode(content).length < 60000,
  { error: "Comment is too large." },
);
