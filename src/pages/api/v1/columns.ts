export const prerender = false;

import type { APIRoute } from "astro";
import { authorizeCli } from "@lib/api/cli-auth.ts";
import { loadLiveBoard } from "@lib/api/v1-http.ts";
import { shortId } from "@lib/api/board-ops.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

// Columns a task can be put in from the CLI, in board order (Trash excluded).
export const GET: APIRoute = async (context) => {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const board = await loadLiveBoard(auth.boardId);
  return jsonResponse(
    board.columns.filter((c) => !c.isTrash).map((c) => ({
      id: c.id,
      shortId: shortId(c.id),
      title: c.title,
    })),
    200,
  );
};
