export const prerender = false;

import type { APIRoute } from "astro";
import { purgeExpiredTrash } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

// Called daily by a Deno Deploy cron: permanently deletes Trash tasks past
// retention on every user's board. Not a user endpoint, so it is guarded by a
// shared secret instead of Clerk. Read at runtime via Deno.env.get(), not
// import.meta.env (see contact.ts for why).
export const POST: APIRoute = async ({ request }) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) {
    console.error({
      event: "Rejected POST /api/purge-trash: CRON_SECRET is not set.",
    });
    return jsonResponse({ error: "Purge is not configured." }, 500);
  }
  if (request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const result = await purgeExpiredTrash();
  console.log({ event: "POST /api/purge-trash completed", ...result });
  return jsonResponse(result, 200);
};
