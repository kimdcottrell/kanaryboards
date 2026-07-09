export const prerender = false;

import type { APIRoute } from "astro";
import { deleteBoard, getBoard, saveBoard } from "@lib/db/kv.ts";
import type { PersistedBoard } from "@lib/db/kv.ts";

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const boardId = locals.boardId;
  if (!boardId) {
    console.error({
      event:
        "Rejected GET /api/board: locals.boardId missing despite passing the auth gate",
      auth: locals.auth(),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const board = await getBoard(boardId);
  if (!board) return jsonResponse({ noData: true }, 404);
  return jsonResponse(board, 200);
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const boardId = locals.boardId;
  if (!boardId) {
    console.error({
      event:
        "Rejected PUT /api/board: locals.boardId missing despite passing the auth gate",
      auth: locals.auth(),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  let body: PersistedBoard;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  console.debug({
    method: "PUT",
    boardId,
    auth: locals.auth(),
    rows: body.rows?.map((r) => r.title),
  });
  await saveBoard(boardId, body);
  return jsonResponse({ ok: true }, 200);
};

export const DELETE: APIRoute = async ({ locals }) => {
  const boardId = locals.boardId;
  if (!boardId) {
    console.error({
      event:
        "Rejected DELETE /api/board: locals.boardId missing despite passing the auth gate",
      auth: locals.auth(),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  console.debug({
    method: "DELETE",
    boardId,
    auth: locals.auth(),
  });
  await deleteBoard(boardId);
  return jsonResponse({ ok: true }, 200);
};
