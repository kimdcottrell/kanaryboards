import { createContext } from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { Dispatch, ReactNode } from "react";
import type {
  BoardAction,
  BoardConfigState,
  BoardData,
  ChecklistAIState,
  ColumnConfigState,
  ColumnEditState,
  ColumnFilterState,
  DragState,
  RowEditState,
  RowFormState,
  Task,
  TaskCreateState,
  TaskEditState,
} from "./types.ts";
import { boardReducer, createInitialState } from "./reducer.ts";
import { STORAGE_KEY } from "./constants.ts";
import { createDemoBoard } from "../demo/demoBoardData.ts";
import { computeTasksByCell } from "./selectors.ts";
import { byOrder } from "./ordering.ts";

export const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(
  null,
);
export const BoardRefsContext = createContext<
  {
    setChecklistInputRef: (id: string, el: HTMLInputElement | null) => void;
    focusChecklistInput: (id: string) => void;
  } | null
>(null);

export function useBoardDispatch(): Dispatch<BoardAction> {
  const dispatch = useContext(BoardDispatchContext);
  if (!dispatch) {
    throw new Error("useBoardDispatch must be used within a BoardProvider");
  }
  return dispatch;
}

export function useBoardRefs() {
  const refs = useContext(BoardRefsContext);
  if (!refs) {
    throw new Error("useBoardRefs must be used within a BoardProvider");
  }
  return refs;
}

const BoardDataContext = createContext<BoardData | null>(null);
export function useBoardDataState(): BoardData {
  const v = useContext(BoardDataContext);
  if (!v) {
    throw new Error("useBoardDataState must be used within a BoardProvider");
  }
  return v;
}

const RowFormContext = createContext<RowFormState | null>(null);
export function useRowFormState(): RowFormState {
  const v = useContext(RowFormContext);
  if (!v) {
    throw new Error("useRowFormState must be used within a BoardProvider");
  }
  return v;
}

const RowEditContext = createContext<RowEditState | null>(null);
export function useRowEditState(): RowEditState {
  const v = useContext(RowEditContext);
  if (!v) {
    throw new Error("useRowEditState must be used within a BoardProvider");
  }
  return v;
}

const ColumnEditContext = createContext<ColumnEditState | null>(null);
export function useColumnEditState(): ColumnEditState {
  const v = useContext(ColumnEditContext);
  if (!v) {
    throw new Error("useColumnEditState must be used within a BoardProvider");
  }
  return v;
}

const ColumnConfigContext = createContext<ColumnConfigState | null>(null);
export function useColumnConfigState(): ColumnConfigState {
  const v = useContext(ColumnConfigContext);
  if (!v) {
    throw new Error("useColumnConfigState must be used within a BoardProvider");
  }
  return v;
}

const BoardConfigContext = createContext<BoardConfigState | null>(null);
export function useBoardConfigState(): BoardConfigState {
  const v = useContext(BoardConfigContext);
  if (!v) {
    throw new Error("useBoardConfigState must be used within a BoardProvider");
  }
  return v;
}

const TaskCreateContext = createContext<TaskCreateState | null>(null);
export function useTaskCreateState(): TaskCreateState {
  const v = useContext(TaskCreateContext);
  if (!v) {
    throw new Error("useTaskCreateState must be used within a BoardProvider");
  }
  return v;
}

const TaskEditContext = createContext<TaskEditState | null>(null);
export function useTaskEditState(): TaskEditState {
  const v = useContext(TaskEditContext);
  if (!v) {
    throw new Error("useTaskEditState must be used within a BoardProvider");
  }
  return v;
}

const ChecklistAIContext = createContext<ChecklistAIState | null>(null);
export function useChecklistAIState(): ChecklistAIState {
  const v = useContext(ChecklistAIContext);
  if (!v) {
    throw new Error("useChecklistAIState must be used within a BoardProvider");
  }
  return v;
}

const DragContext = createContext<DragState | null>(null);
export function useDragState(): DragState {
  const v = useContext(DragContext);
  if (!v) throw new Error("useDragState must be used within a BoardProvider");
  return v;
}

const ColumnFilterContext = createContext<ColumnFilterState | null>(null);
export function useColumnFilterState(): ColumnFilterState {
  const v = useContext(ColumnFilterContext);
  if (!v) {
    throw new Error("useColumnFilterState must be used within a BoardProvider");
  }
  return v;
}

const TasksByCellContext = createContext<Record<string, Task[]> | null>(null);
export function useTasksByCell(): Record<string, Task[]> {
  const v = useContext(TasksByCellContext);
  if (!v) throw new Error("useTasksByCell must be used within a BoardProvider");
  return v;
}

const BoardMetaContext = createContext<
  { boardId: string | undefined } | null
>(null);
export function useBoardMeta(): { boardId: string | undefined } {
  const v = useContext(BoardMetaContext);
  if (!v) throw new Error("useBoardMeta must be used within a BoardProvider");
  return v;
}

export function BoardProvider(
  { children, boardId, isAuthenticated = false }: {
    children: ReactNode;
    boardId: string | undefined;
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
  // boardId === "demo" (landing-page demo): always seed from createDemoBoard(), skip storage entirely.
  useEffect(() => {
    async function load() {
      try {
        if (boardId === "demo") {
          dispatch({ type: "BOARD/LOAD", payload: createDemoBoard() });
          return;
        }
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
            dispatch({ type: "BOARD/RESET" });
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
          dispatch({ type: "BOARD/RESET" });
        }
      } catch (error) {
        // Whatever failed (fetch rejection, res.json() on a non-JSON body,
        // etc.), don't leave boardLoaded stuck false with no visible error.
        console.error("Failed to load board:", error);
        dispatch({ type: "BOARD/RESET" });
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, isAuthenticated]);

  // Persist board on state changes (after initial load).
  // Authenticated: save to API (KV). Unauthenticated: save to localStorage only.
  // boardId === "demo": never write anywhere — the demo board is ephemeral.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (boardId === "demo") return;
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
    boardId,
  ]);

  // DrawerMenu.astro renders its row list outside this React island (an Astro
  // server island, hydrated once at load), so it never learns about client-side
  // row changes on its own. Mirror state.rows into its DOM here instead.
  // boardId === "demo": this provider's rows are the landing-page demo board,
  // not the visitor's real rows — never let it overwrite the shared drawer.
  useEffect(() => {
    if (boardId === "demo") return;
    if (!state.boardLoaded) return;
    const list = document.getElementById("drawer-row-list");
    if (!list) return;
    list.replaceChildren(
      ...[...state.rows].sort(byOrder).map((row) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `/dashboard/row/${row.id}`;
        a.dataset.boardLink = "";
        a.textContent = row.title;
        li.appendChild(a);
        return li;
      }),
    );
  }, [state.rows, state.boardLoaded]);

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

  const boardData = useMemo(
    () => ({
      rows: state.rows,
      columns: state.columns,
      tasks: state.tasks,
      boardLoaded: state.boardLoaded,
    }),
    [state.rows, state.columns, state.tasks, state.boardLoaded],
  );

  const rowFormState = useMemo(
    () => ({
      newRowName: state.newRowName,
      newRowPrompt: state.newRowPrompt,
      newRowFormKey: state.newRowFormKey,
      isGeneratingTasks: state.isGeneratingTasks,
      taskGenerationStatus: state.taskGenerationStatus,
      createRowModalOpen: state.createRowModalOpen,
    }),
    [
      state.newRowName,
      state.newRowPrompt,
      state.newRowFormKey,
      state.isGeneratingTasks,
      state.taskGenerationStatus,
      state.createRowModalOpen,
    ],
  );

  const rowEditState = useMemo(
    () => ({
      editingRowId: state.editingRowId,
      editingRowName: state.editingRowName,
    }),
    [state.editingRowId, state.editingRowName],
  );

  const columnEditState = useMemo(
    () => ({
      editingColumnId: state.editingColumnId,
      editingColumnRowId: state.editingColumnRowId,
      editingColumnName: state.editingColumnName,
    }),
    [state.editingColumnId, state.editingColumnRowId, state.editingColumnName],
  );

  const columnConfigState = useMemo(
    () => ({
      defaultColumnInput: state.defaultColumnInput,
      defaultColumnIcon: state.defaultColumnIcon,
      draggedDefaultIndex: state.draggedDefaultIndex,
    }),
    [
      state.defaultColumnInput,
      state.defaultColumnIcon,
      state.draggedDefaultIndex,
    ],
  );

  const boardConfigState = useMemo(
    () => ({
      boardConfigModalOpen: state.boardConfigModalOpen,
      boardConfigScrollTarget: state.boardConfigScrollTarget,
    }),
    [state.boardConfigModalOpen, state.boardConfigScrollTarget],
  );

  const taskCreateState = useMemo(
    () => ({
      taskCreateModalOpen: state.taskCreateModalOpen,
      taskDraft: state.taskDraft,
    }),
    [state.taskCreateModalOpen, state.taskDraft],
  );

  const taskEditState = useMemo(
    () => ({
      taskEditModalOpen: state.taskEditModalOpen,
      editingTaskId: state.editingTaskId,
      editTaskDraft: state.editTaskDraft,
    }),
    [state.taskEditModalOpen, state.editingTaskId, state.editTaskDraft],
  );

  const checklistAIState = useMemo(
    () => ({
      checklistModalTaskId: state.checklistModalTaskId,
      checklistPrompt: state.checklistPrompt,
      checklistPreview: state.checklistPreview,
      isGeneratingChecklist: state.isGeneratingChecklist,
      checklistModalError: state.checklistModalError,
    }),
    [
      state.checklistModalTaskId,
      state.checklistPrompt,
      state.checklistPreview,
      state.isGeneratingChecklist,
      state.checklistModalError,
    ],
  );

  const dragState = useMemo(
    () => ({ draggedTask: state.draggedTask }),
    [state.draggedTask],
  );

  const columnFilterState = useMemo(
    () => ({ selectedColumnIds: state.selectedColumnIds }),
    [state.selectedColumnIds],
  );

  const tasksByCell = useMemo(
    () => computeTasksByCell(state.tasks),
    [state.tasks],
  );

  const boardMeta = useMemo(() => ({ boardId }), [boardId]);

  return (
    <BoardDispatchContext.Provider value={dispatch}>
      <BoardRefsContext.Provider
        value={{ setChecklistInputRef, focusChecklistInput }}
      >
        <BoardMetaContext.Provider value={boardMeta}>
          <BoardDataContext.Provider value={boardData}>
            <RowFormContext.Provider value={rowFormState}>
              <RowEditContext.Provider value={rowEditState}>
                <ColumnEditContext.Provider value={columnEditState}>
                  <ColumnConfigContext.Provider value={columnConfigState}>
                    <BoardConfigContext.Provider value={boardConfigState}>
                      <TaskCreateContext.Provider value={taskCreateState}>
                        <TaskEditContext.Provider value={taskEditState}>
                          <ChecklistAIContext.Provider value={checklistAIState}>
                            <DragContext.Provider value={dragState}>
                              <ColumnFilterContext.Provider
                                value={columnFilterState}
                              >
                                <TasksByCellContext.Provider
                                  value={tasksByCell}
                                >
                                  {children}
                                </TasksByCellContext.Provider>
                              </ColumnFilterContext.Provider>
                            </DragContext.Provider>
                          </ChecklistAIContext.Provider>
                        </TaskEditContext.Provider>
                      </TaskCreateContext.Provider>
                    </BoardConfigContext.Provider>
                  </ColumnConfigContext.Provider>
                </ColumnEditContext.Provider>
              </RowEditContext.Provider>
            </RowFormContext.Provider>
          </BoardDataContext.Provider>
        </BoardMetaContext.Provider>
      </BoardRefsContext.Provider>
    </BoardDispatchContext.Provider>
  );
}
