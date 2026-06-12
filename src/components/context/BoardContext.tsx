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
  BoardData,
  ChecklistAIState,
  ColumnConfigState,
  ColumnEditState,
  DragState,
  RowEditState,
  RowFormState,
  Task,
  TaskCreateState,
  TaskEditState,
} from "./types.ts";
import { boardReducer, createInitialState } from "./reducer.ts";
import { createDefaultBoard, STORAGE_KEY } from "./constants.ts";
import { computeTasksByCell } from "./selectors.ts";

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

const TasksByCellContext = createContext<Record<string, Task[]> | null>(null);
export function useTasksByCell(): Record<string, Task[]> {
  const v = useContext(TasksByCellContext);
  if (!v) throw new Error("useTasksByCell must be used within a BoardProvider");
  return v;
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
    }),
    [
      state.newRowName,
      state.newRowPrompt,
      state.newRowFormKey,
      state.isGeneratingTasks,
      state.taskGenerationStatus,
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
      draggedDefaultIndex: state.draggedDefaultIndex,
    }),
    [state.defaultColumnInput, state.draggedDefaultIndex],
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

  const tasksByCell = useMemo(
    () => computeTasksByCell(state.tasks),
    [state.tasks],
  );

  return (
    <BoardDispatchContext.Provider value={dispatch}>
      <BoardRefsContext.Provider
        value={{ setChecklistInputRef, focusChecklistInput }}
      >
        <BoardDataContext.Provider value={boardData}>
          <RowFormContext.Provider value={rowFormState}>
            <RowEditContext.Provider value={rowEditState}>
              <ColumnEditContext.Provider value={columnEditState}>
                <ColumnConfigContext.Provider value={columnConfigState}>
                  <TaskCreateContext.Provider value={taskCreateState}>
                    <TaskEditContext.Provider value={taskEditState}>
                      <ChecklistAIContext.Provider value={checklistAIState}>
                        <DragContext.Provider value={dragState}>
                          <TasksByCellContext.Provider value={tasksByCell}>
                            {children}
                          </TasksByCellContext.Provider>
                        </DragContext.Provider>
                      </ChecklistAIContext.Provider>
                    </TaskEditContext.Provider>
                  </TaskCreateContext.Provider>
                </ColumnConfigContext.Provider>
              </ColumnEditContext.Provider>
            </RowEditContext.Provider>
          </RowFormContext.Provider>
        </BoardDataContext.Provider>
      </BoardRefsContext.Provider>
    </BoardDispatchContext.Provider>
  );
}
