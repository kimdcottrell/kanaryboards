export const prerender = false;

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const E2E_TEST_USER_ID: string | null = import.meta.env.E2E_TEST_USER_ID ??
  null;

// making this so an endpoint that allows deleting data from ANYONE'S user_id
// does not exist. That should NOT be made a thing in the REST API
export const GET: APIRoute = async () => {
  if (E2E_TEST_USER_ID === null) {
    console.error({
      event:
        "Rejected GET /api/delete-test-data: E2E_TEST_USER_ID is not set — this endpoint must not be reachable outside test environments.",
    });
    return new Response(JSON.stringify({ error: "Invalid Request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cloudflare KV has no cross-key transactions, so this is two sequential
  // deletes rather than the Deno KV atomic check-and-delete it replaces —
  // fine for a test-only cleanup endpoint, not something to rely on for
  // concurrent-modification safety.
  const kv = env.BOARD_KV;
  const boardId = await kv.get(`user_board:${E2E_TEST_USER_ID}`);
  await kv.delete(`user_board:${E2E_TEST_USER_ID}`);
  if (boardId) await kv.delete(`board:${boardId}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
