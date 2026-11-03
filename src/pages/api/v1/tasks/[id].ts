export const prerender = false;

import type { APIContext, APIRoute } from "astro";
import { authorizeCli } from "@lib/api/cli-auth.ts";
import { checkTaskRefs, validateFields } from "@lib/api/fields.ts";
import {
  ifMatchVersion,
  jsonWithEtag,
  loadLiveBoard,
  readJsonObject,
} from "@lib/api/v1-http.ts";
import { findByRef, taskView, updatedTask } from "@lib/api/board-ops.ts";
import type { TaskInput } from "@lib/api/board-ops.ts";
import { getEntity, saveEntity } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { normalizeTask } from "@components/react/context/reducers/board.ts";
import type { Task } from "@components/react/context/types.ts";

// The task `params.id` (a full id or its last characters) refers to, with its
// versionstamp; or the Response to send instead.
async function findTask(context: APIContext) {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const board = await loadLiveBoard(auth.boardId);
  const found = findByRef(board.tasks, context.params.id ?? "");
  if (!("id" in found)) {
    return jsonResponse({ error: found.error }, found.status);
  }
  const entry = await getEntity<Task>("task", auth.boardId, found.id);
  if (!entry) return jsonResponse({ error: "Not found." }, 404);
  return {
    ...auth,
    board,
    task: normalizeTask(entry.value),
    version: entry.versionstamp,
  };
}

export const GET: APIRoute = async (context) => {
  const found = await findTask(context);
  if (found instanceof Response) return found;
  return jsonWithEtag(taskView(found.board, found.task), 200, found.version);
};

// Body: any of {rowId, colId, title, description, checklist: string[]}.
// checklist items are appended. Requires If-Match with the ETag from GET; 409
// if the task changed since.
export const PATCH: APIRoute = async (context) => {
  const found = await findTask(context);
  if (found instanceof Response) return found;
  if (found.task.trashedAt !== null) {
    return jsonResponse(
      { error: "This task is in Trash. Restore it in the web app first." },
      409,
    );
  }
  const expected = ifMatchVersion(context.request);
  if (!expected) return jsonResponse({ error: "If-Match is required." }, 428);

  const body = await readJsonObject(context.request);
  if (body instanceof Response) return body;

  const fields = validateFields("task", body, "cli");
  if (!fields.ok) return jsonResponse({ error: fields.error }, 422);

  const refs = checkTaskRefs(fields.values, found.board);
  if (!refs.ok) return jsonResponse({ error: refs.error }, 422);

  const task = updatedTask(
    found.board,
    found.task,
    fields.values as Partial<TaskInput>,
  );

  const version = await saveEntity("task", found.boardId, task, expected);
  if (!version) {
    return jsonResponse({ error: "This task changed since it was read." }, 409);
  }
  return jsonWithEtag(taskView(found.board, task), 200, version);
};
