export const prerender = false;

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { z } from "astro/zod";
import { deleteBoard, getBoard, saveBoard } from "@lib/db/kv.ts";

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
});

// Caps a single board payload at ~64KB. Cloudflare KV's own per-value ceiling
// is far higher (25MiB), so this is a deliberate product limit — it keeps one
// board from growing unbounded and bounds the read/write cost per request.
const PersistedBoardSchema = z.object({
  rows: z.array(RowSchema),
  columns: z.array(ColumnSchema),
  tasks: z.array(TaskSchema),
}).refine(
  (board) => new TextEncoder().encode(JSON.stringify(board)).length < 65000,
  { error: "Board payload is too large." },
);

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Reject an unauthenticated request. A top-level browser navigation (someone
// typing /api/board into the address bar) is bounced to the dashboard's
// friendly "you must be logged in" alert; every programmatic fetch — how the
// app actually calls this endpoint — gets a plain 401.
function unauthorizedResponse(request: Request): Response {
  if (request.headers.get("Sec-Fetch-Mode") === "navigate") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard?unauthorized=1",
        "x-authenticated": "false",
      },
    });
  }
  return jsonResponse({ error: "Unauthorized" }, 401);
}

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
  const board = await getBoard(env.BOARD_KV, boardId);
  if (!board) return jsonResponse({ noData: true }, 404);
  return jsonResponse(board, 200);
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return unauthorizedResponse(request);
  const boardId = locals.boardId;
  if (!boardId) {
    console.error({
      event:
        "Rejected PUT /api/board: locals.boardId missing despite passing the auth gate",
      auth: locals.auth(),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  let body: z.infer<typeof PersistedBoardSchema>;
  try {
    body = PersistedBoardSchema.parse(await request.json());
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  console.debug({
    method: "PUT",
    boardId,
    auth: locals.auth(),
    rows: body.rows.map((r) => r.title),
  });
  await saveBoard(env.BOARD_KV, boardId, body);
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
  await deleteBoard(env.BOARD_KV, boardId);
  return jsonResponse({ ok: true }, 200);
};
