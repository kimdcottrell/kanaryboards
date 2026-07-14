export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { deleteBoard, getBoard, saveBoard } from "@lib/db/kv.ts";

// Mirrors Row/Column/Task in @components/context/types.ts (required fields,
// not schema.dbml's looser nullability — nothing downstream of this validator
// is written to handle nulls here).
const RowSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  order: z.string(),
});

const ColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.string(),
  pinnedToShortcut: z.boolean(),
  pinnedToDock: z.boolean(),
  icon: z.string().nullable(),
  iconInBoardMenu: z.boolean(),
  iconNearColumnTitle: z.boolean(),
});

const ChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean(),
  order: z.string(),
});

const TaskSchema = z.object({
  id: z.string(),
  rowId: z.string(),
  colId: z.string(),
  title: z.string(),
  description: z.string(),
  checklist: z.array(ChecklistItemSchema),
  order: z.string(),
});

// Deno KV rejects any single value over 64KiB (see saveBoard in
// @lib/db/kv.ts), which otherwise surfaces as an unhandled 500. Reject it
// here instead, with headroom held back for the KV entry's own overhead.
const PersistedBoardSchema = z.object({
  rows: z.array(RowSchema),
  columns: z.array(ColumnSchema),
  tasks: z.array(TaskSchema),
}).refine(
  (board) => new TextEncoder().encode(JSON.stringify(board)).length < 65000,
  { error: "Board payload is too large." },
);

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
  let body: z.infer<typeof PersistedBoardSchema>;
  try {
    body = PersistedBoardSchema.parse(await request.json());
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  console.debug({
    method: "PUT",
    boardId,
    auth: locals.auth(),
    rows: body.rows.map((r) => r.title),
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
