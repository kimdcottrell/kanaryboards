export const prerender = false;

import type { APIRoute } from "astro";
import { cliRoute, HttpError } from "@lib/api/route.ts";
import { validateFields } from "@lib/api/fields.ts";
import { loadLiveBoard, readJsonObject } from "@lib/api/request.ts";
import { defaultColumns, newRow, rowView } from "@lib/api/board-ops.ts";
import { applyBoardChanges } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

export const GET = cliRoute(async (_context, { boardId }) => {
  const board = await loadLiveBoard(boardId);
  return jsonResponse(board.rows.map((row) => rowView(board, row)), 200);
}) satisfies APIRoute;

// Body: {title, color?}. A user with no board yet also gets the web app's
// default columns, so tasks can be added to the new row.
export const POST = cliRoute(async ({ request }, { boardId }) => {
  const body = await readJsonObject(request);
  const board = await loadLiveBoard(boardId);
  const fields = validateFields("row", body, "cli", ["title"]);
  if (!fields.ok) throw new HttpError(422, fields.error);
  // validateFields returns Record<string, unknown>; "title" is required above
  // and "color" is normalized to a stored value.
  const row = newRow(board, fields.values as { title: string; color?: string });
  const columns = board.columns.length ? [] : defaultColumns();
  await applyBoardChanges(boardId, {
    upserts: { rows: [row], columns, tasks: [] },
    deletes: { rowIds: [], columnIds: [], taskIds: [] },
  });
  return jsonResponse(
    rowView({ ...board, rows: [...board.rows, row], columns }, row),
    201,
  );
}) satisfies APIRoute;
