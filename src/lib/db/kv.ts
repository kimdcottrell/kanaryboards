import type {
  Column,
  Row,
  Task,
  TaskComment,
} from "@components/context/types.ts";
import { isTrashExpired } from "@components/context/constants.ts";

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

// Permanently deletes every Trash task whose `trashedAt` is past retention, on
// every board. Each board is rewritten with an atomic versionstamp check; a
// board the user saved mid-run is skipped and picked up by the next run.
export async function purgeExpiredTrash(now = Date.now()): Promise<{
  boardsScanned: number;
  boardsUpdated: number;
  tasksDeleted: number;
  conflicts: number;
}> {
  const kv = await getKv();
  const result = {
    boardsScanned: 0,
    boardsUpdated: 0,
    tasksDeleted: 0,
    conflicts: 0,
  };
  for await (const entry of kv.list<PersistedBoard>({ prefix: ["board"] })) {
    result.boardsScanned++;
    const board = entry.value;
    const boardId = entry.key[1] as string;
    const trashIds = new Set(
      board.columns.filter((c) => c.isTrash).map((c) => c.id),
    );
    const expired = board.tasks.filter((t) =>
      trashIds.has(t.colId) && isTrashExpired(t.trashedAt ?? null, now)
    );
    if (expired.length === 0) continue;

    const expiredIds = new Set(expired.map((t) => t.id));
    const res = await kv.atomic()
      .check(entry)
      .set(entry.key, {
        ...board,
        tasks: board.tasks.filter((t) => !expiredIds.has(t.id)),
      })
      .commit();
    if (!res.ok) {
      result.conflicts++;
      continue;
    }
    for (const id of expiredIds) await deleteTaskComments(boardId, id);
    result.boardsUpdated++;
    result.tasksDeleted += expired.length;
  }
  return result;
}

/** For unit tests only — injects a KV instance to replace the module singleton. */
export function _setKvForTest(kv: Deno.Kv): void {
  _kv = kv;
}
