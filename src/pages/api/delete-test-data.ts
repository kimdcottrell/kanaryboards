export const prerender = false;

import type { APIRoute } from "astro";

let environment: string = "production";
if (import.meta.env.DEVCONTAINER === "true") {
  environment = "development";
}
if (
  import.meta.env.DENO_TIMELINE !== undefined &&
  import.meta.env.DENO_TIMELINE !== "production"
) {
  environment = "staging";
}

let E2E_TEST_USER_ID: string | null;
switch (environment) {
  case "development":
    E2E_TEST_USER_ID = "user_3EyF80uaLUFw0Tm9gIWAe56nS8e";
    break;
  case "staging":
    E2E_TEST_USER_ID = "user_3EvXS29F2Ire2I1MGgHaBHONzzM";
    break;
  default:
    E2E_TEST_USER_ID = null;
}

// making this so an endpoint that allows deleting data from ANYONE'S user_id
// does not exist. That should NOT be made a thing in the REST API
export const GET: APIRoute = async () => {
  if (E2E_TEST_USER_ID === null) {
    return new Response(JSON.stringify({ error: "Invalid Request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const kv = await Deno.openKv();
  const boardId =
    (await kv.get<string>(["user_board", E2E_TEST_USER_ID])).value;
  if (boardId) await kv.delete(["board", boardId]);
  await kv.delete(["user_board", E2E_TEST_USER_ID]);
  kv.close();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
