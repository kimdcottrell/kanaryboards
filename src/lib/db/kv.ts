import type { Column, Row, Task } from "@components/context/types.ts";

export interface PersistedBoard {
  rows: Row[];
  columns: Column[];
  tasks: Task[];
}

export async function getBoardIdForUser(
  kv: KVNamespace,
  userId: string,
): Promise<string | null> {
  return await kv.get(`user_board:${userId}`);
}

export async function setBoardIdForUser(
  kv: KVNamespace,
  userId: string,
  boardId: string,
): Promise<void> {
  await kv.put(`user_board:${userId}`, boardId);
}

export async function getBoard(
  kv: KVNamespace,
  boardId: string,
): Promise<PersistedBoard | null> {
  return await kv.get<PersistedBoard>(`board:${boardId}`, "json");
}

export async function saveBoard(
  kv: KVNamespace,
  boardId: string,
  board: PersistedBoard,
): Promise<void> {
  await kv.put(`board:${boardId}`, JSON.stringify(board));
}

export async function deleteBoard(
  kv: KVNamespace,
  boardId: string,
): Promise<void> {
  await kv.delete(`board:${boardId}`);
}
