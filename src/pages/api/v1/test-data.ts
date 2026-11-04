export const prerender = false;

import type { APIRoute } from "astro";
import { deleteBoard } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { HttpError, publicRoute } from "@lib/api/route.ts";

const E2E_TEST_USER_ID: string | null = import.meta.env.E2E_TEST_USER_ID ??
  null;

// Deletes the E2E test user's board, and only theirs. Made this way so an
// endpoint that allows deleting data from ANYONE'S user_id does not exist.
// That should NOT be made a thing in the REST API.
export const DELETE = publicRoute(async () => {
  if (E2E_TEST_USER_ID === null) {
    console.error({
      event:
        "Rejected DELETE /api/v1/test-data: E2E_TEST_USER_ID is not set — this endpoint must not be reachable outside test environments.",
    });
    throw new HttpError(400, "Invalid Request");
  }

  const kv = await Deno.openKv();
  const entry = await kv.get<string>(["user_board", E2E_TEST_USER_ID]);
  const atomic = kv
    .atomic()
    .check(entry)
    .delete(["user_board", E2E_TEST_USER_ID]);
  const res = await atomic.commit();
  kv.close();
  if (!res.ok) {
    console.error({
      event:
        "DELETE /api/v1/test-data: KV atomic commit failed (concurrent modification), retry required.",
      userId: E2E_TEST_USER_ID,
    });
    throw new HttpError(409, "Conflict, retry");
  }
  // Not part of the atomic commit above: a board is many entries, more than
  // one commit may hold.
  if (entry.value) await deleteBoard(entry.value);
  return jsonResponse({ ok: true }, 200);
}) satisfies APIRoute;
