export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "astro/zod";
import {
  deleteTaskComment,
  getTaskComment,
  saveTaskComment,
} from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { HttpError, sessionRoute } from "@lib/api/route.ts";
import { parseBody } from "@lib/api/request.ts";
import { ContentSchema } from "@lib/api/comments.ts";
import type { Caller } from "@lib/api/route.ts";
import type { TaskComment } from "@components/react/context/types.ts";

// One comment on task `id`. Only its author may edit or delete it.
type Params = { id: string; commentId: string };

const UpdateSchema = z.object({ content: ContentSchema });

async function findOwnComment(
  params: Params,
  { boardId, userId }: Caller,
): Promise<TaskComment> {
  const existing = await getTaskComment(boardId, params.id, params.commentId);
  if (!existing) throw new HttpError(404, "Not found.");
  if (existing.authorId !== userId) throw new HttpError(403, "Forbidden");
  return existing;
}

export const PATCH = sessionRoute<Params>(
  async ({ params, request }, caller) => {
    const { content } = await parseBody(request, UpdateSchema, {
      boardId: caller.boardId,
    });
    const existing = await findOwnComment(params, caller);
    const comment: TaskComment = {
      ...existing,
      content,
      updatedAt: new Date().toISOString(),
    };
    await saveTaskComment(caller.boardId, comment);
    return jsonResponse(comment, 200);
  },
) satisfies APIRoute<Record<string, unknown>, Params>;

export const DELETE = sessionRoute<Params>(async ({ params }, caller) => {
  await findOwnComment(params, caller);
  await deleteTaskComment(caller.boardId, params.id, params.commentId);
  return jsonResponse({ ok: true }, 200);
}) satisfies APIRoute<Record<string, unknown>, Params>;
