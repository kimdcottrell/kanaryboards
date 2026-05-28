export const prerender = false;

import type { APIRoute } from "astro";
import { saveTaskMetas } from "@lib/kv.ts";

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const boardId = locals.boardId;
  let tasks: Array<{ id: string; title: string; description: string }>;
  try {
    ({ tasks } = await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  await saveTaskMetas(boardId, tasks);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
