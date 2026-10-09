import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { BoardAction, BoardData, BoardState } from "../types.ts";
import { expiredTrashTaskIds } from "../reducers/board.ts";
import { pruneLocalComments } from "../../task/comments/commentStore.ts";
import { STORAGE_KEY } from "../constants.ts";
import { createDemoBoard } from "../../demo/demoBoardData.ts";

// The board saved in localStorage, or null if there is none or it's malformed.
function readLocalBoard() {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Authenticated: load from the API. If the server has no board yet, migrate
// the localStorage one. Returns null to leave the board unloaded.
async function loadRemoteBoard(): Promise<BoardAction | null> {
  const res = await fetch("/api/board");
  if (res.ok) return { type: "BOARD/LOAD", payload: await res.json() };
  // Non-404 errors are unexpected — bail out and leave the board unloaded.
  if (res.status !== 404) return null;

  const local = readLocalBoard();
  if (!local) return { type: "BOARD/RESET" };
  const putRes = await fetch("/api/board", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(local),
  });
  if (putRes.ok) globalThis.localStorage?.removeItem(STORAGE_KEY);
  return { type: "BOARD/LOAD", payload: local };
}

// Unauthenticated: board lives in localStorage only, no KV interaction.
// Comments live in separate localStorage, out of reach of /api/purge-trash,
// so drop those of every task not on the loaded board: expired Trash tasks
// (BOARD/LOAD drops them) and tasks removed with their row or column.
// No board (e.g. after a reset) means no comment belongs to one.
function loadLocalBoard(): BoardAction {
  const local = readLocalBoard();
  if (!local) {
    pruneLocalComments(new Set());
    return { type: "BOARD/RESET" };
  }
  const tasks: { id: string }[] = local.tasks ?? [];
  const expired = expiredTrashTaskIds(local.columns ?? [], tasks, Date.now());
  pruneLocalComments(
    new Set(tasks.map((t) => t.id).filter((id) => !expired.has(id))),
  );
  return { type: "BOARD/LOAD", payload: local };
}

// boardId === "demo" (landing-page demo): always seed from createDemoBoard(),
// skip storage entirely.
async function loadBoard(
  boardId: string | undefined,
  isAuthenticated: boolean,
): Promise<BoardAction | null> {
  if (boardId === "demo") {
    return { type: "BOARD/LOAD", payload: createDemoBoard() };
  }
  return isAuthenticated ? await loadRemoteBoard() : loadLocalBoard();
}

export function useBoardPersistence(
  state: BoardState,
  dispatch: Dispatch<BoardAction>,
  boardId: string | undefined,
  isAuthenticated: boolean,
) {
  // Load board on mount.
  useEffect(() => {
    loadBoard(boardId, isAuthenticated)
      .then((action) => action && dispatch(action))
      .catch((error) => {
        // Whatever failed (fetch rejection, res.json() on a non-JSON body,
        // etc.), don't leave boardLoaded stuck false with no visible error.
        console.error("Failed to load board:", error);
        dispatch({ type: "BOARD/RESET" });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, isAuthenticated]);

  // Persist board on state changes (after initial load).
  // Authenticated: save to API (KV). Unauthenticated: save to localStorage only.
  // boardId === "demo": never write anywhere — the demo board is ephemeral.
  // Each save is also broadcast to this browser's other tabs, which apply it
  // with BOARD/SYNC. lastSyncedRef holds the last received board so applying
  // it doesn't trigger a save + broadcast back (an endless echo between tabs).
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (boardId === "demo") return;
    const channel = new BroadcastChannel(
      `board-sync:${isAuthenticated ? "kv" : "local"}`,
    );
    channel.onmessage = (
      e: MessageEvent<Pick<BoardData, "rows" | "columns" | "tasks">>,
    ) => {
      const { rows, columns, tasks } = e.data;
      lastSyncedRef.current = JSON.stringify({ rows, columns, tasks });
      dispatch({ type: "BOARD/SYNC", payload: { rows, columns, tasks } });
    };
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [boardId, isAuthenticated]);

  // The board as first loaded. Its post-load save isn't broadcast: other tabs
  // already have it, or something newer that it would overwrite.
  const loadedSnapshotRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (boardId === "demo") return;
    if (!state.boardLoaded) return;
    loadedSnapshotRef.current ??= JSON.stringify({
      rows: state.rows,
      columns: state.columns,
      tasks: state.tasks,
    });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const boardSnapshot = {
        rows: state.rows,
        columns: state.columns,
        tasks: state.tasks,
      };
      const body = JSON.stringify(boardSnapshot);
      if (body === lastSyncedRef.current) return;
      if (isAuthenticated) {
        fetch("/api/board", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
      } else {
        globalThis.localStorage?.setItem(STORAGE_KEY, body);
      }
      if (body !== loadedSnapshotRef.current) {
        channelRef.current?.postMessage(boardSnapshot);
      }
      loadedSnapshotRef.current = ""; // only the first save is skipped
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    state.rows,
    state.columns,
    state.tasks,
    state.boardLoaded,
    isAuthenticated,
    boardId,
  ]);
}
