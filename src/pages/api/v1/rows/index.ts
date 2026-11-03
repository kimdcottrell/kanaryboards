export const prerender = false;

import type { APIRoute } from "astro";
import { authorizeCli } from "@lib/api/cli-auth.ts";
import { validateFields } from "@lib/api/fields.ts";
import { loadLiveBoard, readJsonObject } from "@lib/api/v1-http.ts";
import { defaultColumns, newRow, rowView } from "@lib/api/board-ops.ts";
import { applyBoardChanges } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

export const GET: APIRoute = async (context) => {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const board = await loadLiveBoard(auth.boardId);
  return jsonResponse(board.rows.map((row) => rowView(board, row)), 200);
};

// Body: {title, color?}. A user with no board yet also gets the web app's
// default columns, so tasks can be added to the new row.
export const POST: APIRoute = async (context) => {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const body = await readJsonObject(context.request);
  if (body instanceof Response) return body;
  const board = await loadLiveBoard(auth.boardId);
  const fields = validateFields("row", body, board, ["title"]);
  if (!fields.ok) return jsonResponse({ error: fields.error }, 422);
  const row = newRow(board, fields.values as { title: string; color?: string });
  const columns = board.columns.length ? [] : defaultColumns();
  await applyBoardChanges(auth.boardId, {
    upserts: { rows: [row], columns, tasks: [] },
    deletes: { rowIds: [], columnIds: [], taskIds: [] },
  });
  return jsonResponse(
    rowView({ ...board, rows: [...board.rows, row], columns }, row),
    201,
  );
};
