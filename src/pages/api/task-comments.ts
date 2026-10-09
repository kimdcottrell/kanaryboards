export const prerender = false;

import type { APIContext, APIRoute } from "astro";
import { z } from "astro/zod";
import {
  deleteTaskComment,
  deleteTaskComments,
  getTaskComment,
  listTaskComments,
  saveTaskComment,
} from "@lib/db/kv.ts";
import { jsonResponse, unauthorizedResponse } from "@lib/http/api-responses.ts";
import { createId } from "@lib/db/uuid.ts";
import type { TaskComment } from "@components/context/types.ts";

// Each comment is its own KV entry, so it must also stay under Deno KV's
// 64KiB value limit, with headroom for the other fields.
const ContentSchema = z.string().min(1).refine(
  (content) => new TextEncoder().encode(content).length < 60000,
  { error: "Comment is too large." },
);

const CreateSchema = z.object({
  taskId: z.string().min(1),
  content: ContentSchema,
  authorName: z.string(),
  authorImageUrl: z.string().nullable(),
});

const UpdateSchema = z.object({
  taskId: z.string().min(1),
  id: z.string().min(1),
  content: ContentSchema,
});

const DeleteSchema = z.object({
  taskId: z.string().min(1),
  id: z.string().min(1).optional(),
});

// Shared auth gate: returns the caller's userId and boardId, or the Response
// to send back instead.
function authorize(
  { locals, request }: APIContext,
  method: string,
): { userId: string; boardId: string } | Response {
  const { userId } = locals.auth();
  if (!userId) return unauthorizedResponse(request);
  const boardId = locals.boardId;
  if (!boardId) {
    console.error({
      event:
        `Rejected ${method} /api/task-comments: locals.boardId missing despite passing the auth gate`,
      auth: locals.auth(),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return { userId, boardId };
}

async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  method: string,
  boardId: string,
): Promise<T | Response> {
  try {
    return schema.parse(await request.json());
  } catch (error) {
    console.error({
      event: `Rejected ${method} /api/task-comments: invalid request body`,
      boardId,
      issues: error instanceof z.ZodError ? error.issues : String(error),
    });
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
}

export const GET: APIRoute = async (context) => {
  const auth = authorize(context, "GET");
  if (auth instanceof Response) return auth;
  const taskId = context.url.searchParams.get("taskId");
  if (!taskId) return jsonResponse({ error: "taskId is required." }, 400);
  const comments = await listTaskComments(auth.boardId, taskId);
  comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return jsonResponse(comments, 200);
};

export const POST: APIRoute = async (context) => {
  const auth = authorize(context, "POST");
  if (auth instanceof Response) return auth;
  const body = await parseBody(
    context.request,
    CreateSchema,
    "POST",
    auth.boardId,
  );
  if (body instanceof Response) return body;
  const comment: TaskComment = {
    id: createId(),
    taskId: body.taskId,
    authorId: auth.userId,
    authorName: body.authorName,
    authorImageUrl: body.authorImageUrl,
    content: body.content,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
  await saveTaskComment(auth.boardId, comment);
  return jsonResponse(comment, 201);
};

export const PATCH: APIRoute = async (context) => {
  const auth = authorize(context, "PATCH");
  if (auth instanceof Response) return auth;
  const body = await parseBody(
    context.request,
    UpdateSchema,
    "PATCH",
    auth.boardId,
  );
  if (body instanceof Response) return body;
  const existing = await getTaskComment(auth.boardId, body.taskId, body.id);
  if (!existing) return jsonResponse({ error: "Not found." }, 404);
  if (existing.authorId !== auth.userId) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  const comment: TaskComment = {
    ...existing,
    content: body.content,
    updatedAt: new Date().toISOString(),
  };
  await saveTaskComment(auth.boardId, comment);
  return jsonResponse(comment, 200);
};

// With `id`: delete that comment (author only). Without: delete every comment
// on the task — used when the task itself is deleted.
export const DELETE: APIRoute = async (context) => {
  const auth = authorize(context, "DELETE");
  if (auth instanceof Response) return auth;
  const body = await parseBody(
    context.request,
    DeleteSchema,
    "DELETE",
    auth.boardId,
  );
  if (body instanceof Response) return body;
  if (!body.id) {
    await deleteTaskComments(auth.boardId, body.taskId);
    return jsonResponse({ ok: true }, 200);
  }
  const existing = await getTaskComment(auth.boardId, body.taskId, body.id);
  if (!existing) return jsonResponse({ error: "Not found." }, 404);
  if (existing.authorId !== auth.userId) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  await deleteTaskComment(auth.boardId, body.taskId, body.id);
  return jsonResponse({ ok: true }, 200);
};
