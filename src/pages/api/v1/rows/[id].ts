export const prerender = false;

import type { APIRoute } from "astro";
import { cliRoute, HttpError } from "@lib/api/route.ts";
import type { Caller } from "@lib/api/route.ts";
import { validateFields } from "@lib/api/fields.ts";
import {
  ifMatchVersion,
  jsonWithEtag,
  loadLiveBoard,
  readJsonObject,
} from "@lib/api/request.ts";
import { findByRef, rowView } from "@lib/api/board-ops.ts";
import { getEntity, saveEntity } from "@lib/db/kv.ts";
import type { Row } from "@components/react/context/types.ts";

// `id` is a full row id or its last characters (see findByRef).
type Params = { id: string };

// The row `ref` refers to, with its versionstamp.
async function findRow(ref: string, { boardId }: Caller) {
  const board = await loadLiveBoard(boardId);
  const found = findByRef(board.rows, ref);
  if (!("id" in found)) throw new HttpError(found.status, found.error);
  const entry = await getEntity<Row>("row", boardId, found.id);
  if (!entry) throw new HttpError(404, "Not found.");
  return { board, row: entry.value, version: entry.versionstamp };
}

export const GET = cliRoute<Params>(async ({ params }, caller) => {
  const found = await findRow(params.id, caller);
  return jsonWithEtag(rowView(found.board, found.row), 200, found.version);
}) satisfies APIRoute<Record<string, unknown>, Params>;

// Body: {title?, color?}. Requires If-Match with the ETag from GET; 409 if the
// row changed since.
export const PATCH = cliRoute<Params>(async ({ params, request }, caller) => {
  const found = await findRow(params.id, caller);
  const expected = ifMatchVersion(request);
  if (!expected) throw new HttpError(428, "If-Match is required.");
  const body = await readJsonObject(request);
  const fields = validateFields("row", body, "cli");
  if (!fields.ok) throw new HttpError(422, fields.error);
  const row: Row = { ...found.row, ...fields.values };
  const version = await saveEntity("row", caller.boardId, row, expected);
  if (!version) throw new HttpError(409, "This row changed since it was read.");
  return jsonWithEtag(rowView(found.board, row), 200, version);
}) satisfies APIRoute<Record<string, unknown>, Params>;
