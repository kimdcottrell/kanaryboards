export const prerender = false;

import type { APIRoute } from "astro";
import { cliRoute, HttpError } from "@lib/api/route.ts";
import { checkTaskRefs, validateFields } from "@lib/api/fields.ts";
import { loadLiveBoard, readJsonObject } from "@lib/api/request.ts";
import { newTask, taskView } from "@lib/api/board-ops.ts";
import type { TaskInput } from "@lib/api/board-ops.ts";
import { applyBoardChanges } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

// Tasks not in Trash, in board order; `?rowId=` limits them to one row.
export const GET = cliRoute(async ({ url }, { boardId }) => {
  const board = await loadLiveBoard(boardId);
  const rowId = url.searchParams.get("rowId");
  const rowOrder = new Map(board.rows.map((r, i) => [r.id, i]));
  const colOrder = new Map(board.columns.map((c, i) => [c.id, i]));
  const tasks = board.tasks
    .filter((t) => t.trashedAt === null && (!rowId || t.rowId === rowId))
    .sort((a, b) =>
      rowOrder.get(a.rowId)! - rowOrder.get(b.rowId)! ||
      colOrder.get(a.colId)! - colOrder.get(b.colId)!
    );
  return jsonResponse(tasks.map((task) => taskView(board, task)), 200);
}) satisfies APIRoute;

// Body: {rowId, colId, title, description?, checklist?: string[], items?}.
export const POST = cliRoute(async ({ request }, { boardId }) => {
  const body = await readJsonObject(request);
  const board = await loadLiveBoard(boardId);
  const fields = validateFields("task", body, "cli", [
    "rowId",
    "colId",
    "title",
  ]);
  if (!fields.ok) throw new HttpError(422, fields.error);
  const refs = checkTaskRefs(fields.values, board);
  if (!refs.ok) throw new HttpError(422, refs.error);
  // validateFields returns Record<string, unknown>; rowId, colId and title are
  // required above, and the CLI's rules give checklist as string[].
  const task = newTask(board, {
    description: "",
    checklist: [],
    ...fields.values,
  } as unknown as TaskInput);
  await applyBoardChanges(boardId, { upserts: { tasks: [task] } });
  return jsonResponse(taskView(board, task), 201);
}) satisfies APIRoute;
