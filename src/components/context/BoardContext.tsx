import { createContext } from "preact";
import { useCallback, useContext, useEffect, useReducer, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { Dispatch } from "preact/hooks";
import type { BoardAction, BoardState } from "./types.ts";
import { boardReducer, createInitialState } from "./reducer.ts";
import { STORAGE_KEY } from "./constants.ts";

export const BoardStateContext = createContext<BoardState | null>(null);
export const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(
  null,
);
export const BoardRefsContext = createContext<{
  setChecklistInputRef: (id: string, el: HTMLInputElement | null) => void;
  focusChecklistInput: (id: string) => void;
} | null>(null);

export function useBoardState(): BoardState {
  const state = useContext(BoardStateContext);
  if (!state) throw new Error("useBoardState must be used within a BoardProvider");
  return state;
}

export function useBoardDispatch(): Dispatch<BoardAction> {
  const dispatch = useContext(BoardDispatchContext);
  if (!dispatch) throw new Error("useBoardDispatch must be used within a BoardProvider");
  return dispatch;
}

export function BoardProvider({ children }: { children: ComponentChildren }) {
  const [state, dispatch] = useReducer(boardReducer, undefined, createInitialState);

  useEffect(() => {
    if (typeof globalThis.localStorage === "undefined") return;
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rows: state.rows,
        columns: state.columns,
        tasks: state.tasks,
        defaultColumnNames: state.defaultColumnNames,
      }),
    );
  }, [state.rows, state.columns, state.tasks, state.defaultColumnNames]);

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
