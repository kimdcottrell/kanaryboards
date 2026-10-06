import type {
  Column,
  Row,
  Task,
  TaskComment,
} from "@components/context/types.ts";

export interface PersistedBoard {
  rows: Row[];
  columns: Column[];
  tasks: Task[];
}

let _kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!_kv) _kv = await Deno.openKv();
  return _kv;
}

export async function getBoardIdForUser(
  userId: string,
): Promise<string | null> {
  const kv = await getKv();
  const result = await kv.get<string>(["user_board", userId]);
  return result.value;
}

export async function setBoardIdForUser(
  userId: string,
  boardId: string,
): Promise<void> {
  const kv = await getKv();
  await kv.set(["user_board", userId], boardId);
}

export async function getBoard(
  boardId: string,
): Promise<PersistedBoard | null> {
  const kv = await getKv();
  const result = await kv.get<PersistedBoard>(["board", boardId]);
  return result.value;
}

export async function saveBoard(
  boardId: string,
  board: PersistedBoard,
): Promise<void> {
  const kv = await getKv();
  await kv.set(["board", boardId], board);
}

export async function deleteBoard(boardId: string): Promise<void> {
  const kv = await getKv();
  await kv.delete(["board", boardId]);
}

// Comments live outside the board blob, one entry per comment, so they never
// count toward the board's 64KiB value limit.
// Key: ["task_comment", boardId, taskId, commentId]

export async function listTaskComments(
  boardId: string,
  taskId: string,
): Promise<TaskComment[]> {
  const kv = await getKv();
  const comments: TaskComment[] = [];
  for await (
    const entry of kv.list<TaskComment>({
      prefix: ["task_comment", boardId, taskId],
    })
  ) {
    comments.push(entry.value);
  }
  return comments;
}

export async function getTaskComment(
  boardId: string,
  taskId: string,
  commentId: string,
): Promise<TaskComment | null> {
  const kv = await getKv();
  const result = await kv.get<TaskComment>([
    "task_comment",
    boardId,
    taskId,
    commentId,
  ]);
  return result.value;
}

export async function saveTaskComment(
  boardId: string,
  comment: TaskComment,
): Promise<void> {
  const kv = await getKv();
  await kv.set(
    ["task_comment", boardId, comment.taskId, comment.id],
    comment,
  );
}

export async function deleteTaskComment(
  boardId: string,
  taskId: string,
  commentId: string,
): Promise<void> {
  const kv = await getKv();
  await kv.delete(["task_comment", boardId, taskId, commentId]);
}

async function deleteByPrefix(prefix: Deno.KvKey): Promise<void> {
  const kv = await getKv();
  for await (const entry of kv.list({ prefix })) {
    await kv.delete(entry.key);
  }
}

export function deleteTaskComments(
  boardId: string,
  taskId: string,
): Promise<void> {
  return deleteByPrefix(["task_comment", boardId, taskId]);
}

export function deleteBoardComments(boardId: string): Promise<void> {
  return deleteByPrefix(["task_comment", boardId]);
}

/** For unit tests only — injects a KV instance to replace the module singleton. */
export function _setKvForTest(kv: Deno.Kv): void {
  _kv = kv;
}
