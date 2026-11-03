export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "astro/zod";
import {
  applyBoardChanges,
  deleteBoard,
  deleteBoardComments,
  getBoard,
} from "@lib/db/kv.ts";
import { jsonResponse, unauthorizedResponse } from "@lib/http/api-responses.ts";

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
  isTrash: z.boolean(),
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
  trashedAt: z.string().nullable(),
  preTrashColId: z.string().nullable(),
});

// Deno KV rejects any single value over 64KiB (each row/column/task is its
// own entry, see applyBoardChanges in @lib/db/kv.ts), which otherwise surfaces
// as an unhandled 500. Reject it here instead, with headroom held back for the
// KV entry's own overhead.
const fitsKvValue = <T extends z.ZodType>(schema: T) =>
  schema.refine(
    (value) => new TextEncoder().encode(JSON.stringify(value)).length < 65000,
    { error: "Entry is too large." },
  );

// Larger change sets are valid for applyBoardChanges (it splits them into
// several commits), but no single edit produces this many.
const MAX_CHANGES = 1000;

const BoardChangesSchema = z.object({
  upserts: z.object({
    rows: z.array(fitsKvValue(RowSchema)),
    columns: z.array(fitsKvValue(ColumnSchema)),
    tasks: z.array(fitsKvValue(TaskSchema)),
  }),
  deletes: z.object({
    rowIds: z.array(z.string()),
    columnIds: z.array(z.string()),
    taskIds: z.array(z.string()),
  }),
}).refine(
  ({ upserts, deletes }) =>
    upserts.rows.length + upserts.columns.length + upserts.tasks.length +
        deletes.rowIds.length + deletes.columnIds.length +
        deletes.taskIds.length <= MAX_CHANGES,
  { error: "Too many changes." },
);

export const GET: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return unauthorizedResponse(request);
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

export const PATCH: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return unauthorizedResponse(request);
  const boardId = locals.boardId;
  if (!boardId) {
    console.error({
      event:
        "Rejected PATCH /api/board: locals.boardId missing despite passing the auth gate",
      auth: locals.auth(),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  let body: z.infer<typeof BoardChangesSchema>;
  try {
    body = BoardChangesSchema.parse(await request.json());
  } catch (error) {
    console.error({
      event: "Rejected PATCH /api/board: invalid request body",
      boardId,
      issues: error instanceof z.ZodError ? error.issues : String(error),
    });
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  console.debug({
    method: "PATCH",
    boardId,
    auth: locals.auth(),
    rows: body.upserts.rows.map((r) => r.title),
  });
  await applyBoardChanges(boardId, body);
  return jsonResponse({ ok: true }, 200);
};

export const DELETE: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return unauthorizedResponse(request);
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
  await deleteBoardComments(boardId);
  return jsonResponse({ ok: true }, 200);
};
