import type { APIContext } from "astro";
import { createId } from "@lib/db/uuid.ts";
import { getBoardIdForUser, setBoardIdForUser } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { isPaidUser } from "@lib/api/billing.ts";

// Auth gate for /api/v1/*, which the kanby CLI calls with a Clerk OAuth access
// token instead of a session cookie. src/middleware.ts only resolves boardId
// for session tokens, so it is resolved (or created) here. Returns the
// caller's userId and boardId, or the Response to send back instead.
export async function authorizeCli(
  { locals }: APIContext,
): Promise<{ userId: string; boardId: string } | Response> {
  const { userId } = locals.auth({ acceptsToken: "oauth_token" });
  if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!await isPaidUser(userId)) {
    return jsonResponse(
      { error: "The Kanby CLI requires a paid plan." },
      402,
    );
  }
  let boardId = await getBoardIdForUser(userId);
  if (!boardId) {
    boardId = createId();
    await setBoardIdForUser(userId, boardId);
  }
  return { userId, boardId };
}
