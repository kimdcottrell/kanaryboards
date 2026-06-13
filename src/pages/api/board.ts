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

function authorize(locals: App.Locals): App.Locals | Response {
  const { userId } = locals.auth();
  if (!userId) return jsonResponse({ error: "Unauthorized." }, 401);
  return locals;
}
export const GET: APIRoute = async ({ locals }) => {
  authorize(locals);
  const boardId = locals.boardId;
  const board = await getBoard(boardId);
  if (!board) return jsonResponse({ noData: true }, 404);
  return jsonResponse(board, 200);
};

export const PUT: APIRoute = async ({ request, locals }) => {
  authorize(locals);
  const boardId = locals.boardId;
  let body: PersistedBoard;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  await Deno.writeTextFile(
    "/tmp/board-debug.log",
    `${new Date().toISOString()} PUT boardId=${boardId} auth=${
      JSON.stringify(locals.auth())
    } rows=${JSON.stringify(body.rows?.map((r) => r.title))}\n`,
    { append: true },
  );
  await saveBoard(boardId, body);
  return jsonResponse({ ok: true }, 200);
};

export const DELETE: APIRoute = async ({ locals }) => {
  authorize(locals);
  const boardId = locals.boardId;
  await Deno.writeTextFile(
    "/tmp/board-debug.log",
    `${new Date().toISOString()} DELETE boardId=${boardId} auth=${
      JSON.stringify(locals.auth())
    }\n`,
    { append: true },
  );
  await deleteBoard(boardId);
  return jsonResponse({ ok: true }, 200);
};
