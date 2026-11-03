export const prerender = false;

import type { APIRoute } from "astro";
import { authorizeCli } from "@lib/api/cli-auth.ts";
import { checkTaskRefs, validateFields } from "@lib/api/fields.ts";
import { loadLiveBoard, readJsonObject } from "@lib/api/v1-http.ts";
import { newTask, taskView } from "@lib/api/board-ops.ts";
import type { TaskInput } from "@lib/api/board-ops.ts";
import { applyBoardChanges } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

// Tasks not in Trash, in board order; `?rowId=` limits them to one row.
export const GET: APIRoute = async (context) => {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const board = await loadLiveBoard(auth.boardId);
  const rowId = context.url.searchParams.get("rowId");
  const rowOrder = new Map(board.rows.map((r, i) => [r.id, i]));
  const colOrder = new Map(board.columns.map((c, i) => [c.id, i]));
  const tasks = board.tasks
    .filter((t) => t.trashedAt === null && (!rowId || t.rowId === rowId))
    .sort((a, b) =>
      rowOrder.get(a.rowId)! - rowOrder.get(b.rowId)! ||
      colOrder.get(a.colId)! - colOrder.get(b.colId)!
    );
  return jsonResponse(tasks.map((task) => taskView(board, task)), 200);
};

// Body: {rowId, colId, title, description?, checklist?: string[]}.
export const POST: APIRoute = async (context) => {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const body = await readJsonObject(context.request);
  if (body instanceof Response) return body;
  const board = await loadLiveBoard(auth.boardId);
  const fields = validateFields("task", body, "cli", [
    "rowId",
    "colId",
    "title",
  ]);
  if (!fields.ok) return jsonResponse({ error: fields.error }, 422);
  const refs = checkTaskRefs(fields.values, board);
  if (!refs.ok) return jsonResponse({ error: refs.error }, 422);
  const task = newTask(board, {
    description: "",
    checklist: [],
    ...fields.values,
  } as unknown as TaskInput);
  await applyBoardChanges(auth.boardId, {
    upserts: { rows: [], columns: [], tasks: [task] },
    deletes: { rowIds: [], columnIds: [], taskIds: [] },
  });
  return jsonResponse(taskView(board, task), 201);
};
