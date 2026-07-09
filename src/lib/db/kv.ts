import type { Column, Row, Task } from "@components/context/types.ts";

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

/** For unit tests only — injects a KV instance to replace the module singleton. */
export function _setKvForTest(kv: Deno.Kv): void {
  _kv = kv;
}
