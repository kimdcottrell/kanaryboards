import { createContext } from "react";
import { useCallback, useContext, useEffect, useReducer, useRef } from "react";
import type { Dispatch, ReactNode } from "react";
import type { BoardAction, BoardState } from "./types.ts";
import { boardReducer, createInitialState } from "./reducer.ts";
import { STORAGE_KEY } from "./constants.ts";

export const BoardStateContext = createContext<BoardState | null>(null);
export const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(
  null,
);
export const BoardRefsContext = createContext<
  {
    setChecklistInputRef: (id: string, el: HTMLInputElement | null) => void;
    focusChecklistInput: (id: string) => void;
  } | null
>(null);

export function useBoardState(): BoardState {
  const state = useContext(BoardStateContext);
  if (!state) {
    throw new Error("useBoardState must be used within a BoardProvider");
  }
  return state;
}

export function useBoardDispatch(): Dispatch<BoardAction> {
  const dispatch = useContext(BoardDispatchContext);
  if (!dispatch) {
    throw new Error("useBoardDispatch must be used within a BoardProvider");
  }
  return dispatch;
}

export function BoardProvider(
  { children, boardId }: { children: ReactNode; boardId: string },
) {
  const [state, dispatch] = useReducer(
    boardReducer,
    undefined,
    createInitialState,
  );

  // Load board from API on mount, migrating localStorage data if present.
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/board");
      if (!res.ok) return;
      const remote = await res.json();

      // If the server returned an empty board (no tasks/rows beyond defaults),
      // check localStorage for data to migrate.
      const hasRemoteData = remote.tasks?.length > 0 || remote.rows?.length > 1;
      if (!hasRemoteData) {
        const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const local = JSON.parse(stored);
            if (local.tasks?.length > 0 || local.rows?.length > 1) {
              await fetch("/api/board", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(local),
              });
              globalThis.localStorage?.removeItem(STORAGE_KEY);
              dispatch({ type: "BOARD/LOAD", payload: local });
              return;
            }
          } catch {
            // ignore malformed localStorage
          }
        }
      }

      dispatch({ type: "BOARD/LOAD", payload: remote });
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // Persist to API whenever board data changes (after initial load).
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.boardLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: state.rows,
          columns: state.columns,
          tasks: state.tasks,
          defaultColumnNames: state.defaultColumnNames,
        }),
      });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    state.rows,
    state.columns,
    state.tasks,
    state.defaultColumnNames,
    state.boardLoaded,
  ]);

  const checklistInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const setChecklistInputRef = useCallback(
    (id: string, el: HTMLInputElement | null) => {
      if (el) checklistInputRefs.current[id] = el;
      else delete checklistInputRefs.current[id];
    },
    [],
  );

  const focusChecklistInput = useCallback((id: string) => {
    checklistInputRefs.current[id]?.focus();
  }, []);

  return (
    <BoardDispatchContext.Provider value={dispatch}>
      <BoardStateContext.Provider value={state}>
        <BoardRefsContext.Provider
          value={{ setChecklistInputRef, focusChecklistInput }}
        >
          {children}
        </BoardRefsContext.Provider>
      </BoardStateContext.Provider>
    </BoardDispatchContext.Provider>
  );
}
