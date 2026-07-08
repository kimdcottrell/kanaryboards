export const prerender = false;

import type { APIRoute } from "astro";

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

  const kv = await Deno.openKv();
  const entry = await kv.get<string>(["user_board", E2E_TEST_USER_ID]);
  const atomic = kv
    .atomic()
    .check(entry)
    .delete(["user_board", E2E_TEST_USER_ID]);
  if (entry.value) atomic.delete(["board", entry.value]);
  const res = await atomic.commit();
  kv.close();
  if (!res.ok) {
    console.error({
      event:
        "GET /api/delete-test-data: KV atomic commit failed (concurrent modification), retry required.",
      userId: E2E_TEST_USER_ID,
    });
    return new Response(JSON.stringify({ error: "Conflict, retry" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
