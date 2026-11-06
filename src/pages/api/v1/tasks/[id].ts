export const prerender = false;

import type { APIRoute } from "astro";
import { cliRoute, HttpError } from "@lib/api/route.ts";
import type { Caller } from "@lib/api/route.ts";
import { checkTaskRefs, validateFields } from "@lib/api/fields.ts";
import {
  ifMatchVersion,
  jsonWithEtag,
  loadLiveBoard,
  readJsonObject,
} from "@lib/api/request.ts";
import { findByRef, taskView, updatedTask } from "@lib/api/board-ops.ts";
import type { TaskInput } from "@lib/api/board-ops.ts";
import { getEntity, saveEntity } from "@lib/db/kv.ts";
import { normalizeTask } from "@components/react/context/reducers/board.ts";
import type { Task } from "@components/react/context/types.ts";

// `id` is a full task id or its last characters (see findByRef).
type Params = { id: string };

// The task `ref` refers to, with its versionstamp.
async function findTask(ref: string, { boardId }: Caller) {
  const board = await loadLiveBoard(boardId);
  const found = findByRef(board.tasks, ref);
  if (!("id" in found)) throw new HttpError(found.status, found.error);
  const entry = await getEntity<Task>("task", boardId, found.id);
  if (!entry) throw new HttpError(404, "Not found.");
  return {
    board,
    task: normalizeTask(entry.value),
    version: entry.versionstamp,
  };
}

export const GET = cliRoute<Params>(async ({ params }, caller) => {
  const found = await findTask(params.id, caller);
  return jsonWithEtag(taskView(found.board, found.task), 200, found.version);
}) satisfies APIRoute<Record<string, unknown>, Params>;

// Body: any of {rowId, colId, title, description, checklist: string[],
// checked: string[]}. checklist items are appended; checked (full item ids)
// marks those existing items done and the others not. Requires If-Match with
// the ETag from GET; 409 if the task changed since.
export const PATCH = cliRoute<Params>(async ({ params, request }, caller) => {
  const found = await findTask(params.id, caller);
  if (found.task.trashedAt !== null) {
    throw new HttpError(
      409,
      "This task is in Trash. Restore it in the web app first.",
    );
  }
  const expected = ifMatchVersion(request);
  if (!expected) throw new HttpError(428, "If-Match is required.");

  const body = await readJsonObject(request);

  const fields = validateFields("task", body, "cli");
  if (!fields.ok) throw new HttpError(422, fields.error);

  const refs = checkTaskRefs(fields.values, found.board);
  if (!refs.ok) throw new HttpError(422, refs.error);

  // validateFields returns Record<string, unknown>; the CLI's rules give
  // checklist as string[] and the rest as strings.
  const task = updatedTask(
    found.board,
    found.task,
    fields.values as Partial<TaskInput>,
  );

  const version = await saveEntity("task", caller.boardId, task, expected);
  if (!version) {
    throw new HttpError(409, "This task changed since it was read.");
  }
  return jsonWithEtag(taskView(found.board, task), 200, version);
}) satisfies APIRoute<Record<string, unknown>, Params>;
