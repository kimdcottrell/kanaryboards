import type { Column, Row, Task } from "@components/context/types.ts";

export interface PersistedBoard {
  rows: Row[];
  columns: Column[];
  tasks: Task[];
  defaultColumnNames: string[];
}

export interface TaskMeta extends Task {
  boardId: string;
}

let _kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!_kv) _kv = await Deno.openKv();
  return _kv;
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
  const tx = kv.atomic().set(["board", boardId], board);
  for (const task of board.tasks) {
    tx.set(
      ["task_meta", task.id],
      {
        id: task.id,
        rowId: task.rowId,
        colId: task.colId,
        title: task.title,
        description: task.description,
        checklist: task.checklist,
        boardId,
      } satisfies TaskMeta,
    );
  }
  await tx.commit();
}

export async function deleteBoard(boardId: string): Promise<void> {
  const kv = await getKv();
  const board = await getBoard(boardId);
  const tx = kv.atomic().delete(["board", boardId]);
  for (const task of board?.tasks ?? []) {
    tx.delete(["task_meta", task.id]);
  }
  await tx.commit();
}

export async function getTaskMeta(taskId: string): Promise<TaskMeta | null> {
  const kv = await getKv();
  const result = await kv.get<TaskMeta>(["task_meta", taskId]);
  return result.value;
}

/** For unit tests only — injects a KV instance to replace the module singleton. */
export function _setKvForTest(kv: Deno.Kv): void {
  _kv = kv;
}
