export const prerender = false;

import type { APIContext, APIRoute } from "astro";
import { authorizeCli } from "@lib/api/cli-auth.ts";
import { validateFields } from "@lib/api/fields.ts";
import {
  ifMatchVersion,
  jsonWithEtag,
  loadLiveBoard,
  readJsonObject,
} from "@lib/api/v1-http.ts";
import { findByRef, rowView } from "@lib/api/board-ops.ts";
import { getEntity, saveEntity } from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import type { Row } from "@components/react/context/types.ts";

// The row `params.id` (a full id or its last characters) refers to, with its
// versionstamp; or the Response to send instead.
async function findRow(context: APIContext) {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const board = await loadLiveBoard(auth.boardId);
  const found = findByRef(board.rows, context.params.id ?? "");
  if (!("id" in found)) {
    return jsonResponse({ error: found.error }, found.status);
  }
  const entry = await getEntity<Row>("row", auth.boardId, found.id);
  if (!entry) return jsonResponse({ error: "Not found." }, 404);
  return { ...auth, board, row: entry.value, version: entry.versionstamp };
}

export const GET: APIRoute = async (context) => {
  const found = await findRow(context);
  if (found instanceof Response) return found;
  return jsonWithEtag(rowView(found.board, found.row), 200, found.version);
};

// Body: {title?, color?}. Requires If-Match with the ETag from GET; 409 if the
// row changed since.
export const PATCH: APIRoute = async (context) => {
  const found = await findRow(context);
  if (found instanceof Response) return found;
  const expected = ifMatchVersion(context.request);
  if (!expected) return jsonResponse({ error: "If-Match is required." }, 428);
  const body = await readJsonObject(context.request);
  if (body instanceof Response) return body;
  const fields = validateFields("row", body, "cli");
  if (!fields.ok) return jsonResponse({ error: fields.error }, 422);
  const row: Row = { ...found.row, ...fields.values };
  const version = await saveEntity("row", found.boardId, row, expected);
  if (!version) {
    return jsonResponse({ error: "This row changed since it was read." }, 409);
  }
  return jsonWithEtag(rowView(found.board, row), 200, version);
};
