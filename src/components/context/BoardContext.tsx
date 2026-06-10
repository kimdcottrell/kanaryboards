import { createContext } from "react";
import { useCallback, useContext, useEffect, useReducer, useRef } from "react";
import type { Dispatch, ReactNode } from "react";
import type { BoardAction, BoardState } from "./types.ts";
import { boardReducer, createInitialState } from "./reducer.ts";
import { createDefaultBoard, STORAGE_KEY } from "./constants.ts";

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
  { children, boardId, isAuthenticated = false }: {
    children: ReactNode;
    boardId: string;
    isAuthenticated?: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    boardReducer,
    undefined,
    createInitialState,
  );

  // Load board on mount. Authenticated: load from API, migrate localStorage if needed.
  // Unauthenticated: load from localStorage (falling back to API for legacy KV data).
  useEffect(() => {
    async function load() {
      if (isAuthenticated) {
        const res = await fetch("/api/board");
        // Non-404 errors are unexpected — bail out and leave the board unloaded.
        if (!res.ok && res.status !== 404) return;
        const hasRemoteData = res.ok;
        const remote = hasRemoteData ? await res.json() : null;

        // Migrate full board from localStorage if the server has no data yet.
        if (!hasRemoteData) {
          const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const local = JSON.parse(stored);
              const putRes = await fetch("/api/board", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(local),
              });
              if (putRes.ok) {
                globalThis.localStorage?.removeItem(STORAGE_KEY);
              }
              dispatch({ type: "BOARD/LOAD", payload: local });
              return;
            } catch {
              // ignore malformed localStorage
            }
          }
          dispatch({ type: "BOARD/LOAD", payload: createDefaultBoard() });
          return;
        }

        dispatch({ type: "BOARD/LOAD", payload: remote });
      } else {
        // Unauthenticated: board lives in localStorage only, no KV interaction.
        const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const local = JSON.parse(stored);
            dispatch({ type: "BOARD/LOAD", payload: local });
            return;
          } catch {
            // ignore malformed localStorage
          }
        }
        dispatch({ type: "BOARD/LOAD", payload: createDefaultBoard() });
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, isAuthenticated]);

  // Persist board on state changes (after initial load).
  // Authenticated: save to API (KV). Unauthenticated: save to localStorage only.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.boardLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const boardSnapshot = {
        rows: state.rows,
        columns: state.columns,
        tasks: state.tasks,
      };
      if (isAuthenticated) {
        fetch("/api/board", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(boardSnapshot),
        });
      } else {
        globalThis.localStorage?.setItem(
          STORAGE_KEY,
          JSON.stringify(boardSnapshot),
        );
      }
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
