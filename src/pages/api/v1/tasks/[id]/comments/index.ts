export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "astro/zod";
import {
  deleteTaskComments,
  listTaskComments,
  saveTaskComment,
} from "@lib/db/kv.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { sessionRoute } from "@lib/api/route.ts";
import { parseBody } from "@lib/api/request.ts";
import { ContentSchema } from "@lib/api/comments.ts";
import { createId } from "@lib/db/uuid.ts";
import type { TaskComment } from "@components/react/context/types.ts";

// The comments on task `id` (its full id: the web app's, not the CLI's short
// refs). Session-only, unlike the CLI's tasks/[id].ts next to this folder.
type Params = { id: string };

const CreateSchema = z.object({
  content: ContentSchema,
  authorName: z.string(),
  authorImageUrl: z.string().nullable(),
});

// Newest first.
export const GET = sessionRoute<Params>(async ({ params }, { boardId }) => {
  const comments = await listTaskComments(boardId, params.id);
  comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return jsonResponse(comments, 200);
}) satisfies APIRoute<Record<string, unknown>, Params>;

export const POST = sessionRoute<Params>(
  async ({ params, request }, { boardId, userId }) => {
    const body = await parseBody(request, CreateSchema, { boardId });
    const comment: TaskComment = {
      id: createId(),
      taskId: params.id,
      authorId: userId,
      authorName: body.authorName,
      authorImageUrl: body.authorImageUrl,
      content: body.content,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
    await saveTaskComment(boardId, comment);
    return jsonResponse(comment, 201);
  },
) satisfies APIRoute<Record<string, unknown>, Params>;

// Every comment on the task, by anyone: used when the task itself is deleted.
export const DELETE = sessionRoute<Params>(async ({ params }, { boardId }) => {
  await deleteTaskComments(boardId, params.id);
  return jsonResponse({ ok: true }, 200);
}) satisfies APIRoute<Record<string, unknown>, Params>;
