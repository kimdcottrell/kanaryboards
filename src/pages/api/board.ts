export const prerender = false;

import type { APIRoute } from "astro";
import { deleteBoard, getBoard, saveBoard } from "@lib/kv.ts";
import type { PersistedBoard } from "@lib/kv.ts";

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const boardId = locals.boardId;
  const board = await getBoard(boardId);
  if (!board) return jsonResponse({ noData: true }, 404);
  return jsonResponse(board, 200);
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return jsonResponse({ error: "Unauthorized." }, 401);
  const boardId = locals.boardId;
  let body: PersistedBoard;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  await saveBoard(boardId, body);
  return jsonResponse({ ok: true }, 200);
};

export const DELETE: APIRoute = async ({ locals }) => {
  const boardId = locals.boardId;
  await deleteBoard(boardId);
  return jsonResponse({ ok: true }, 200);
};
