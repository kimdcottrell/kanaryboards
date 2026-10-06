import { createId } from "@lib/db/uuid.ts";
import type { TaskComment } from "../context/types.ts";

// Where a board's comments live mirrors where the board itself lives
// (see BoardContext): the API when signed in, localStorage when signed out,
// and nowhere (memory only) for the landing-page demo board.
export interface CommentStoreTarget {
  boardId: string | undefined;
  isAuthenticated: boolean;
}

export interface NewComment {
  content: string;
  authorName: string;
  authorImageUrl: string | null;
}

export const COMMENTS_STORAGE_KEY = "kanby-comments-v0-1-0";

const demoComments = new Map<string, TaskComment[]>();

type Backend = "api" | "local" | "demo";

function backendFor({ boardId, isAuthenticated }: CommentStoreTarget): Backend {
  if (boardId === "demo") return "demo";
  return isAuthenticated ? "api" : "local";
}

function readLocal(): Record<string, TaskComment[]> {
  try {
    return JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function readTask(backend: Backend, taskId: string): TaskComment[] {
  return backend === "demo"
    ? demoComments.get(taskId) ?? []
    : readLocal()[taskId] ?? [];
}

function writeTask(
  backend: Backend,
  taskId: string,
  comments: TaskComment[],
): void {
  if (backend === "demo") {
    demoComments.set(taskId, comments);
    return;
  }
  const all = readLocal();
  if (comments.length) all[taskId] = comments;
  else delete all[taskId];
  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
}

async function request<T>(
  method: string,
  body?: object,
  query = "",
): Promise<T> {
  const res = await fetch(`/api/task-comments${query}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} /api/task-comments failed (${res.status})`);
  }
  return res.json();
}

export const byNewest = (a: TaskComment, b: TaskComment) =>
  b.createdAt.localeCompare(a.createdAt);

export async function listComments(
  target: CommentStoreTarget,
  taskId: string,
): Promise<TaskComment[]> {
  const backend = backendFor(target);
  const comments = backend === "api"
    ? await request<TaskComment[]>(
      "GET",
      undefined,
      `?taskId=${encodeURIComponent(taskId)}`,
    )
    : readTask(backend, taskId);
  return [...comments].sort(byNewest);
}

export async function createComment(
  target: CommentStoreTarget,
  taskId: string,
  input: NewComment,
): Promise<TaskComment> {
  const backend = backendFor(target);
  if (backend === "api") {
    return await request<TaskComment>("POST", { taskId, ...input });
  }
  const comment: TaskComment = {
    id: createId(),
    taskId,
    authorId: null,
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
  writeTask(backend, taskId, [...readTask(backend, taskId), comment]);
  return comment;
}

export async function updateComment(
  target: CommentStoreTarget,
  comment: TaskComment,
  content: string,
): Promise<TaskComment> {
  const backend = backendFor(target);
  if (backend === "api") {
    return await request<TaskComment>("PATCH", {
      taskId: comment.taskId,
      id: comment.id,
      content,
    });
  }
  const updated = { ...comment, content, updatedAt: new Date().toISOString() };
  writeTask(
    backend,
    comment.taskId,
    readTask(backend, comment.taskId).map((c) =>
      c.id === comment.id ? updated : c
    ),
  );
  return updated;
}

export async function deleteComment(
  target: CommentStoreTarget,
  comment: TaskComment,
): Promise<void> {
  const backend = backendFor(target);
  if (backend === "api") {
    await request("DELETE", { taskId: comment.taskId, id: comment.id });
    return;
  }
  writeTask(
    backend,
    comment.taskId,
    readTask(backend, comment.taskId).filter((c) => c.id !== comment.id),
  );
}

export async function deleteAllComments(
  target: CommentStoreTarget,
  taskId: string,
): Promise<void> {
  const backend = backendFor(target);
  if (backend === "api") {
    await request("DELETE", { taskId });
    return;
  }
  writeTask(backend, taskId, []);
}
