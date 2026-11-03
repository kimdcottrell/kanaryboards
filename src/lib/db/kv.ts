import type {
  Column,
  Row,
  Task,
  TaskComment,
} from "@components/react/context/types.ts";
import { isTrashExpired } from "@components/react/context/constants.ts";

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

// Each row, column and task is its own entry, so saving one never rewrites
// the others and the board as a whole isn't bound by the 64KiB value limit.
// Key: [kind, boardId, id]. Boards saved before this live in a single
// ["board", boardId] entry until getBoard migrates them.

// Only what changed since the last save (PATCH /api/board).
export interface BoardChanges {
  upserts: PersistedBoard;
  deletes: { rowIds: string[]; columnIds: string[]; taskIds: string[] };
}

async function listValues<T>(prefix: Deno.KvKey): Promise<T[]> {
  const kv = await getKv();
  const values: T[] = [];
  for await (const entry of kv.list<T>({ prefix })) values.push(entry.value);
  return values;
}

async function listBoard(boardId: string): Promise<PersistedBoard | null> {
  const [rows, columns, tasks] = await Promise.all([
    listValues<Row>(["row", boardId]),
    listValues<Column>(["column", boardId]),
    listValues<Task>(["task", boardId]),
  ]);
  if (rows.length || columns.length || tasks.length) {
    return { rows, columns, tasks };
  }
  return null;
}

export async function getBoard(
  boardId: string,
): Promise<PersistedBoard | null> {
  const board = await listBoard(boardId);
  if (board) return board;
  const kv = await getKv();
  const legacy = await kv.get<PersistedBoard>(["board", boardId]);
  if (!legacy.value) return null;
  // One commit, checked against the legacy entry: if another request migrated
  // it first, the user may have saved since, so keep what's stored. A legacy
  // board fits in one commit: it was capped at 64KiB.
  const atomic = kv.atomic().check(legacy).delete(["board", boardId]);
  const { rows, columns, tasks } = legacy.value;
  for (const row of rows) atomic.set(["row", boardId, row.id], row);
  for (const col of columns) atomic.set(["column", boardId, col.id], col);
  for (const task of tasks) atomic.set(["task", boardId, task.id], task);
  const res = await atomic.commit();
  if (!res.ok) return listBoard(boardId);
  return legacy.value;
}

// Deno KV caps one atomic commit at 1000 mutations and 800KiB; leave headroom
// for key and encoding overhead.
const MAX_COMMIT_MUTATIONS = 1000;
const MAX_COMMIT_BYTES = 750 * 1024;

// Commits atomically, unless the changes exceed one commit's limits; then
// each chunk is atomic on its own.
export async function applyBoardChanges(
  boardId: string,
  { upserts, deletes }: BoardChanges,
): Promise<void> {
  const kv = await getKv();
  const set = (kind: string) => (value: { id: string }): Deno.KvMutation => ({
    type: "set",
    key: [kind, boardId, value.id],
    value,
  });
  const del = (kind: string) => (id: string): Deno.KvMutation => ({
    type: "delete",
    key: [kind, boardId, id],
  });
  const mutations = [
    ...upserts.rows.map(set("row")),
    ...upserts.columns.map(set("column")),
    ...upserts.tasks.map(set("task")),
    ...deletes.rowIds.map(del("row")),
    ...deletes.columnIds.map(del("column")),
    ...deletes.taskIds.map(del("task")),
  ];
  let batch: Deno.KvMutation[] = [];
  let bytes = 0;
  const commit = async () => {
    if (batch.length > 0) await kv.atomic().mutate(...batch).commit();
    batch = [];
    bytes = 0;
  };
  for (const mutation of mutations) {
    const size = new TextEncoder().encode(JSON.stringify(mutation)).length;
    if (
      batch.length === MAX_COMMIT_MUTATIONS || bytes + size > MAX_COMMIT_BYTES
    ) {
      await commit();
    }
    batch.push(mutation);
    bytes += size;
  }
  await commit();
}

export type EntityKind = "row" | "column" | "task";

// One row/column/task with its versionstamp, which the CLI API hands out as
// an ETag so an edit can be rejected if the entity changed in the meantime.
export async function getEntity<T>(
  kind: EntityKind,
  boardId: string,
  id: string,
): Promise<{ value: T; versionstamp: string } | null> {
  const kv = await getKv();
  const entry = await kv.get<T>([kind, boardId, id]);
  if (entry.versionstamp === null) return null;
  return { value: entry.value, versionstamp: entry.versionstamp };
}

// Saves `value` only if its entry is still at `expectedVersion`. Returns the
// new versionstamp, or null if the entry changed since it was read.
export async function saveEntity<T extends { id: string }>(
  kind: EntityKind,
  boardId: string,
  value: T,
  expectedVersion: string,
): Promise<string | null> {
  const kv = await getKv();
  const key = [kind, boardId, value.id];
  const res = await kv.atomic()
    .check({ key, versionstamp: expectedVersion })
    .set(key, value)
    .commit();
  return res.ok ? res.versionstamp : null;
}

export async function deleteBoard(boardId: string): Promise<void> {
  const kv = await getKv();
  await Promise.all(
    ["row", "column", "task"].map((kind) => deleteByPrefix([kind, boardId])),
  );
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

// Orphan comments younger than this are kept: a comment posted on a new task
// can land before the autosave that adds the task to the board.
const ORPHAN_COMMENT_GRACE_MS = 24 * 60 * 60 * 1000;

// Permanently deletes every Trash task whose `trashedAt` is past retention, on
// every board (`trashedAt` is only set while a task is in Trash). Each delete
// checks the task's versionstamp; a task the user saved mid-run is skipped and
// picked up by the next run. Then deletes comments whose task is gone (purged
// here, expired on load, or removed with its row/column) — KV has no cascade.
// Boards still in the legacy ["board", boardId] entry are migrated first, so
// their tasks are under ["task"] like every other board's.
export async function purgeExpiredTrash(now = Date.now()): Promise<{
  boardsScanned: number;
  boardsUpdated: number;
  tasksDeleted: number;
  commentsDeleted: number;
  conflicts: number;
}> {
  const kv = await getKv();
  const scanned = new Set<string>();
  const updated = new Set<string>();
  const result = { tasksDeleted: 0, commentsDeleted: 0, conflicts: 0 };
  for await (const entry of kv.list({ prefix: ["board"] })) {
    await getBoard(entry.key[1] as string);
  }
  for await (const entry of kv.list<Task>({ prefix: ["task"] })) {
    const boardId = entry.key[1] as string;
    scanned.add(boardId);
    if (!isTrashExpired(entry.value.trashedAt ?? null, now)) continue;
    const res = await kv.atomic().check(entry).delete(entry.key).commit();
    if (!res.ok) {
      result.conflicts++;
      continue;
    }
    updated.add(boardId);
    result.tasksDeleted++;
  }

  for await (
    const comment of kv.list<TaskComment>({ prefix: ["task_comment"] })
  ) {
    const boardId = comment.key[1] as string;
    const { taskId, createdAt } = comment.value;
    if (now - Date.parse(createdAt) < ORPHAN_COMMENT_GRACE_MS) continue;
    const task = await kv.get(["task", boardId, taskId]);
    if (task.versionstamp !== null) continue;
    await kv.delete(comment.key);
    result.commentsDeleted++;
  }
  return {
    boardsScanned: scanned.size,
    boardsUpdated: updated.size,
    ...result,
  };
}

/** For unit tests only — injects a KV instance to replace the module singleton. */
export function _setKvForTest(kv: Deno.Kv): void {
  _kv = kv;
}
