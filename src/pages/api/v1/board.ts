export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "astro/zod";
import {
  applyBoardChanges,
  deleteBoard,
  deleteBoardComments,
  getBoard,
  getBoardRevision,
  revisionCheck,
} from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { HttpError, sessionRoute } from "@lib/api/route.ts";
import {
  ifMatchRevision,
  jsonWithEtag,
  parseBody,
  revisionEtag,
} from "@lib/api/request.ts";
import { checklistItemSchema, validateFields } from "@lib/api/fields.ts";
import type { Column, EntityKind, Row, Task } from "@lib/types.ts";

// Mirrors Row/Column/Task in @lib/types.ts (required fields,
// not schema.dbml's looser nullability — nothing downstream of this validator
// is written to handle nulls here).
const RowSchema: z.ZodType<Row> = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  order: z.string(),
});

const ColumnSchema: z.ZodType<Column> = z.object({
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

const TaskSchema: z.ZodType<Task> = z.object({
  id: z.string(),
  rowId: z.string(),
  colId: z.string(),
  title: z.string(),
  description: z.string(),
  checklist: z.array(checklistItemSchema),
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

// The field rules the app runs before saving (POST /api/v1/validate), checked
// again on every upsert. Reject-only: what the app sent is saved as is, since
// a normalized value echoed back by live refresh could overwrite what the
// user sees.
function checkFields({ upserts }: z.infer<typeof BoardChangesSchema>) {
  const entities: [EntityKind, object[]][] = [
    ["row", upserts.rows],
    ["column", upserts.columns],
    ["task", upserts.tasks],
  ];
  for (const [kind, items] of entities) {
    for (const item of items) {
      const result = validateFields(
        kind,
        item as Record<string, unknown>,
        "app",
      );
      if (!result.ok) {
        throw new HttpError(422, { field: result.field, error: result.error });
      }
    }
  }
}

// ETag: the board's revision (see getBoardRevision), read before the board so
// a write in between makes the next save conflict rather than go unnoticed.
export const GET = sessionRoute(async (_context, { boardId }) => {
  const revision = revisionEtag(await getBoardRevision(boardId));
  const board = await getBoard(boardId);
  if (!board) return jsonWithEtag({ noData: true }, 404, revision);
  return jsonWithEtag(board, 200, revision);
}) satisfies APIRoute;

// If-Match: the revision from GET (or a previous PATCH). 409 if the board was
// written since. Without If-Match the save isn't checked (HeroStartForm,
// test-data). ETag: the board's new revision.
export const PATCH = sessionRoute(async ({ locals, request }, { boardId }) => {
  const revision = ifMatchRevision(request);
  const body = await parseBody(request, BoardChangesSchema, { boardId });
  console.debug({
    method: "PATCH",
    boardId,
    auth: locals.auth(),
    rows: body.upserts.rows.map((r) => r.title),
  });
  checkFields(body);
  const res = await applyBoardChanges(
    boardId,
    body,
    revision === undefined ? undefined : [revisionCheck(boardId, revision)],
  );
  if (!res.ok) throw new HttpError(409, { conflict: true });
  return jsonWithEtag(
    { ok: true },
    200,
    revisionEtag(res.versionstamp ?? await getBoardRevision(boardId)),
  );
}) satisfies APIRoute;

export const DELETE = sessionRoute(async ({ locals }, { boardId }) => {
  console.debug({
    method: "DELETE",
    boardId,
    auth: locals.auth(),
  });
  await deleteBoard(boardId);
  await deleteBoardComments(boardId);
  return jsonResponse({ ok: true }, 200);
}) satisfies APIRoute;
