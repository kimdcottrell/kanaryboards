import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject } from "react";
import type { PersistedBoard } from "@lib/types.ts";
import type { BoardState } from "../types.ts";
import type { BoardAction } from "../reducer.ts";
import type { BoardChanges } from "@lib/db/kv.ts";
import { liveBoard } from "@lib/api/board-ops.ts";
import { expiredTrashTaskIds } from "../reducers/board.ts";
import { pruneLocalComments } from "../../task/comments/commentStore.ts";
import { STORAGE_KEY } from "../constants.ts";
import { createDemoBoard } from "../../demo/demoBoardData.ts";

type Entities = Record<"rows" | "columns" | "tasks", { id: string }[]>;

// What the server last confirmed, as each entity's JSON by id. Authenticated
// autosave sends only what differs from it.
export type SavedBoard = Record<keyof Entities, Map<string, string>>;

export function toSavedBoard(board: Entities): SavedBoard {
  const byId = (items: { id: string }[]) =>
    new Map(items.map((item) => [item.id, JSON.stringify(item)]));
  return {
    rows: byId(board.rows),
    columns: byId(board.columns),
    tasks: byId(board.tasks),
  };
}

// Rows/columns/tasks that are new or changed since `saved`, and the ids of
// those no longer on the board. null when nothing changed.
export function diffBoard(
  saved: SavedBoard,
  board: PersistedBoard,
): BoardChanges | null {
  const changed = <T extends { id: string }>(
    items: T[],
    prev: Map<string, string>,
  ) => items.filter((item) => prev.get(item.id) !== JSON.stringify(item));
  const removed = (items: { id: string }[], prev: Map<string, string>) => {
    const ids = new Set(items.map((item) => item.id));
    return [...prev.keys()].filter((id) => !ids.has(id));
  };
  const changes: BoardChanges = {
    upserts: {
      rows: changed(board.rows, saved.rows),
      columns: changed(board.columns, saved.columns),
      tasks: changed(board.tasks, saved.tasks),
    },
    deletes: {
      rowIds: removed(board.rows, saved.rows),
      columnIds: removed(board.columns, saved.columns),
      taskIds: removed(board.tasks, saved.tasks),
    },
  };
  const isEmpty = [
    ...Object.values(changes.upserts),
    ...Object.values(changes.deletes),
  ].every((list) => list.length === 0);
  return isEmpty ? null : changes;
}

function applyToSaved(saved: SavedBoard, { upserts, deletes }: BoardChanges) {
  for (const kind of ["rows", "columns", "tasks"] as const) {
    for (const item of upserts[kind]) {
      saved[kind].set(item.id, JSON.stringify(item));
    }
  }
  deletes.rowIds.forEach((id) => saved.rows.delete(id));
  deletes.columnIds.forEach((id) => saved.columns.delete(id));
  deletes.taskIds.forEach((id) => saved.tasks.delete(id));
}

const emptySavedBoard = () =>
  toSavedBoard({ rows: [], columns: [], tasks: [] });

// The most upserts + deletes PATCH /api/v1/board accepts in one request.
const MAX_PATCH_CHANGES = 1000;

// Splits `changes` into PATCH-sized pieces. Upserts come first, rows and
// columns before tasks, so a task never lands before its row or column.
export function chunkChanges(
  { upserts, deletes }: BoardChanges,
  size = MAX_PATCH_CHANGES,
): BoardChanges[] {
  const ops: ((chunk: BoardChanges) => void)[] = [
    ...upserts.rows.map((row) => (c: BoardChanges) => c.upserts.rows.push(row)),
    ...upserts.columns.map((col) => (c: BoardChanges) =>
      c.upserts.columns.push(col)
    ),
    ...upserts.tasks.map((task) => (c: BoardChanges) =>
      c.upserts.tasks.push(task)
    ),
    ...deletes.rowIds.map((id) => (c: BoardChanges) =>
      c.deletes.rowIds.push(id)
    ),
    ...deletes.columnIds.map((id) => (c: BoardChanges) =>
      c.deletes.columnIds.push(id)
    ),
    ...deletes.taskIds.map((id) => (c: BoardChanges) =>
      c.deletes.taskIds.push(id)
    ),
  ];
  const chunks: BoardChanges[] = [];
  for (let i = 0; i < ops.length; i += size) {
    const chunk: BoardChanges = {
      upserts: { rows: [], columns: [], tasks: [] },
      deletes: { rowIds: [], columnIds: [], taskIds: [] },
    };
    ops.slice(i, i + size).forEach((op) => op(chunk));
    chunks.push(chunk);
  }
  return chunks;
}

// Sends `changes` as one or more PATCHes, stopping at the first one the
// server rejects. Returns whether all were accepted.
async function patchBoard(changes: BoardChanges): Promise<boolean> {
  for (const chunk of chunkChanges(changes)) {
    const res = await fetch("/api/v1/board", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) return false;
  }
  return true;
}

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
// the localStorage one. Returns null to leave the board unloaded. `savedRef`
// is set to what the server holds, so the first autosave sends only what
// BOARD/LOAD normalized (or everything, if the migration failed).
async function loadRemoteBoard(
  savedRef: RefObject<SavedBoard>,
): Promise<BoardAction | null> {
  const res = await fetch("/api/v1/board");
  if (res.ok) {
    const remote = await res.json();
    savedRef.current = toSavedBoard(remote);
    return { type: "BOARD/LOAD", payload: remote };
  }
  // Non-404 errors are unexpected — bail out and leave the board unloaded.
  if (res.status !== 404) return null;

  const local = readLocalBoard();
  if (!local) return { type: "BOARD/RESET" };
  const migrated = await patchBoard({
    upserts: {
      rows: local.rows ?? [],
      columns: local.columns ?? [],
      tasks: local.tasks ?? [],
    },
    deletes: { rowIds: [], columnIds: [], taskIds: [] },
  });
  if (migrated) {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    savedRef.current = toSavedBoard(local);
  }
  return { type: "BOARD/LOAD", payload: local };
}

// Unauthenticated: board lives in localStorage only, no KV interaction.
// Comments live in separate localStorage, out of reach of /api/v1/cron/purge-trash,
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
  savedRef: RefObject<SavedBoard>,
): Promise<BoardAction | null> {
  if (boardId === "demo") {
    return { type: "BOARD/LOAD", payload: createDemoBoard() };
  }
  return isAuthenticated ? await loadRemoteBoard(savedRef) : loadLocalBoard();
}

export function useBoardPersistence(
  state: BoardState,
  dispatch: Dispatch<BoardAction>,
  boardId: string | undefined,
  isAuthenticated: boolean,
) {
  const savedRef = useRef<SavedBoard>(emptySavedBoard());

  // Load board on mount.
  useEffect(() => {
    loadBoard(boardId, isAuthenticated, savedRef)
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
  // Authenticated: send what changed to the API (KV). Unauthenticated: save
  // to localStorage only.
  // boardId === "demo": never write anywhere — the demo board is ephemeral.
  // Each save is also broadcast to this browser's other tabs, which apply it
  // with BOARD/SYNC. lastSyncedRef holds the last received board so applying
  // it doesn't trigger a save + broadcast back (an endless echo between tabs).
  // The sending tab already saved it, so it also becomes savedRef.
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (boardId === "demo") return;
    const channel = new BroadcastChannel(
      `board-sync:${isAuthenticated ? "kv" : "local"}`,
    );
    channel.onmessage = (
      e: MessageEvent<PersistedBoard>,
    ) => {
      const { rows, columns, tasks } = e.data;
      lastSyncedRef.current = JSON.stringify({ rows, columns, tasks });
      savedRef.current = toSavedBoard({ rows, columns, tasks });
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
  // PATCHes run one at a time, so an older one can't land after a newer one.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  // Whether the server rejected the latest save; cleared once one succeeds.
  const [saveRejected, setSaveRejected] = useState(false);
  // An edit is waiting on the 500ms autosave timer. A refresh then would
  // replace the board before the edit is saved, so it waits for the timer
  // (refreshQueuedRef) instead.
  const savePendingRef = useRef(false);
  const refreshQueuedRef = useRef(false);

  // Applies the server's board if it changed elsewhere (the CLI, another
  // device). Queued on saveChainRef, so it runs after any PATCH in flight;
  // this tab's own saves then match savedRef and are skipped. Applied like
  // a cross-tab sync: lastSyncedRef stops it from being saved or broadcast.
  const refreshFromServer = useCallback(() => {
    saveChainRef.current = saveChainRef.current.then(async () => {
      if (savePendingRef.current) {
        refreshQueuedRef.current = true;
        return;
      }
      const res = await fetch("/api/v1/board");
      if (!res.ok) return;
      const remote: PersistedBoard = await res.json();
      // The user may have started an edit during the GET.
      if (savePendingRef.current) {
        refreshQueuedRef.current = true;
        return;
      }
      if (!diffBoard(savedRef.current, remote)) return;
      const board = liveBoard(remote);
      savedRef.current = toSavedBoard(remote);
      lastSyncedRef.current = JSON.stringify(board);
      dispatch({ type: "BOARD/SYNC", payload: board });
    }).catch((error) => console.error("Failed to refresh board:", error));
  }, [dispatch]);

  const runQueuedRefresh = useCallback(() => {
    if (!refreshQueuedRef.current) return;
    refreshQueuedRef.current = false;
    refreshFromServer();
  }, [refreshFromServer]);

  // Server-Sent Events from /api/v1/board/events: one message per board write,
  // and one on connect. EventSource reconnects by itself after a drop.
  useEffect(() => {
    if (boardId === "demo" || !isAuthenticated || !state.boardLoaded) return;
    const events = new EventSource("/api/v1/board/events");
    events.onmessage = refreshFromServer;
    return () => events.close();
  }, [boardId, isAuthenticated, state.boardLoaded, refreshFromServer]);

  useEffect(() => {
    if (boardId === "demo") return;
    if (!state.boardLoaded) return;
    loadedSnapshotRef.current ??= JSON.stringify({
      rows: state.rows,
      columns: state.columns,
      tasks: state.tasks,
    });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    savePendingRef.current = true;
    saveTimeoutRef.current = setTimeout(() => {
      savePendingRef.current = false;
      const boardSnapshot = {
        rows: state.rows,
        columns: state.columns,
        tasks: state.tasks,
      };
      const body = JSON.stringify(boardSnapshot);
      if (body === lastSyncedRef.current) return runQueuedRefresh();
      if (isAuthenticated) {
        // Diffed when its turn comes, against what the server has confirmed
        // by then. A failed save leaves savedRef alone, so the next one
        // resends its changes.
        saveChainRef.current = saveChainRef.current.then(async () => {
          const changes = diffBoard(savedRef.current, boardSnapshot);
          if (!changes) return;
          const saved = await patchBoard(changes);
          if (saved) applyToSaved(savedRef.current, changes);
          setSaveRejected(!saved);
        }).catch((error) => console.error("Failed to save board:", error));
      } else {
        globalThis.localStorage?.setItem(STORAGE_KEY, body);
      }
      if (body !== loadedSnapshotRef.current) {
        channelRef.current?.postMessage(boardSnapshot);
      }
      loadedSnapshotRef.current = ""; // only the first save is skipped
      runQueuedRefresh(); // queued after this save
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
    runQueuedRefresh,
  ]);

  return {
    saveRejected,
    dismissSaveRejected: useCallback(() => setSaveRejected(false), []),
  };
}
