export const prerender = false;

import type { APIRoute } from "astro";
import { purgeExpiredTrash } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { HttpError, publicRoute } from "@lib/api/route.ts";

// Called daily by a Deno Deploy cron: permanently deletes Trash tasks past
// retention on every user's board. Not a user endpoint, so it is guarded by a
// shared secret instead of Clerk. Read at runtime via Deno.env.get(), not
// import.meta.env (see contact-messages.ts for why).
export const POST = publicRoute(async ({ request }) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) {
    console.error({
      event: "Rejected POST /api/v1/cron/purge-trash: CRON_SECRET is not set.",
    });
    throw new HttpError(500, "Purge is not configured.");
  }
  if (request.headers.get("Authorization") !== `Bearer ${secret}`) {
    throw new HttpError(401, "Unauthorized");
  }
  const result = await purgeExpiredTrash();
  console.log({ event: "POST /api/v1/cron/purge-trash completed", ...result });
  return jsonResponse(result, 200);
}) satisfies APIRoute;
