import { createContext } from "react";
import { useContext, useMemo, useReducer } from "react";
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
import { computeTasksByCell } from "./selectors.ts";
import { useBoardPersistence } from "./effects/useBoardPersistence.ts";
import { useDrawerRowMirror } from "./effects/useDrawerRowMirror.ts";
import { useChecklistInputRefs } from "./effects/useChecklistInputRefs.ts";

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
  { boardId: string | undefined; isAuthenticated: boolean } | null
>(null);
export function useBoardMeta(): {
  boardId: string | undefined;
  isAuthenticated: boolean;
} {
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

  useBoardPersistence(state, dispatch, boardId, isAuthenticated);
  useDrawerRowMirror(state.rows, state.boardLoaded, boardId);
  const checklistInputRefs = useChecklistInputRefs();

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
      taskGenerationFailed: state.taskGenerationFailed,
      createRowModalOpen: state.createRowModalOpen,
    }),
    [
      state.newRowName,
      state.newRowPrompt,
      state.newRowFormKey,
      state.isGeneratingTasks,
      state.taskGenerationStatus,
      state.taskGenerationFailed,
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

  const boardMeta = useMemo(
    () => ({ boardId, isAuthenticated }),
    [boardId, isAuthenticated],
  );

  return (
    <BoardDispatchContext.Provider value={dispatch}>
      <BoardRefsContext.Provider value={checklistInputRefs}>
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
