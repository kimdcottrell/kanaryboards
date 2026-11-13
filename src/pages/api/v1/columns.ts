export const prerender = false;

import type { APIRoute } from "astro";
import { cliRoute } from "@lib/api/route.ts";
import { loadLiveBoard } from "@lib/api/request.ts";
import { shortId } from "@lib/api/board-ops.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import type { ColumnView } from "@lib/types.ts";

// Columns a task can be put in from the CLI, in board order (Trash excluded).
export const GET = cliRoute(async (_context, { boardId }) => {
  const board = await loadLiveBoard(boardId);
  return jsonResponse(
    board.columns.filter((c) => !c.isTrash).map((c): ColumnView => ({
      id: c.id,
      shortId: shortId(c.id),
      title: c.title,
    })),
    200,
  );
}) satisfies APIRoute;
