import { vi } from "vitest";
import type { Column, Row, Task } from "@components/context/types.ts";
import type {
  useBoardDataState,
  useBoardRefs,
  useChecklistAIActions,
  useChecklistAIState,
  useDragActions,
  useTaskActions,
  useTaskCreateActions,
  useTaskCreateState,
  useTaskEditActions,
  useTaskEditState,
} from "@components/context/hooks.ts";

type TaskCreateState = ReturnType<typeof useTaskCreateState>;
type TaskCreateActions = ReturnType<typeof useTaskCreateActions>;
type ChecklistAIState = ReturnType<typeof useChecklistAIState>;
type ChecklistAIActions = ReturnType<typeof useChecklistAIActions>;
type BoardRefs = ReturnType<typeof useBoardRefs>;
type TaskEditState = ReturnType<typeof useTaskEditState>;
type TaskEditActions = ReturnType<typeof useTaskEditActions>;
type BoardDataState = ReturnType<typeof useBoardDataState>;
type TaskActions = ReturnType<typeof useTaskActions>;
type DragActions = ReturnType<typeof useDragActions>;

export const mockRow: Row = {
  id: "row-1",
  title: "Feature",
  color: "#ff6b6b",
  order: "a0",
};
export const mockColumn: Column = { id: "col-1", title: "To Do", order: "a0" };
export const secondColumn: Column = {
  id: "col-2",
  title: "In Progress",
  order: "a1",
};
export const secondRow: Row = {
  id: "row-2",
  title: "Backend",
  color: "#4ecdc4",
  order: "a1",
};

export const mockTask: Task = {
  id: "task-1",
  rowId: "row-1",
  colId: "col-1",
  order: "a0",
  title: "Test task",
  description: "",
  checklist: [],
};

export const mockTaskDraft: Task = {
  id: "",
  order: "",
  title: "",
  description: "",
  checklist: [],
  rowId: "row-1",
  colId: "col-1",
};

export function makeTaskCreateState(
  overrides: Partial<TaskCreateState> = {},
): TaskCreateState {
  return {
    taskCreateModalOpen: false,
    taskDraft: mockTaskDraft,
    ...overrides,
  };
}

export function makeTaskCreateActions(
  overrides: Partial<TaskCreateActions> = {},
): TaskCreateActions {
  return {
    setTaskDraft: vi.fn(),
    createTask: vi.fn(),
    addChecklistItem: vi.fn(),
    updateChecklistItem: vi.fn(),
    deleteChecklistItem: vi.fn(),
    ...overrides,
  };
}

export function makeChecklistAIState(
  overrides: Partial<ChecklistAIState> = {},
): ChecklistAIState {
  return {
    checklistModalTaskId: null,
    checklistPrompt: "",
    checklistPreview: [] as string[],
    isGeneratingChecklist: false,
    checklistModalError: "",
    ...overrides,
  };
}

export function makeChecklistAIActions(
  overrides: Partial<ChecklistAIActions> = {},
): ChecklistAIActions {
  return {
    setChecklistPrompt: vi.fn(),
    generateChecklistItems: vi.fn(),
    applyChecklistPreview: vi.fn(),
    applyChecklistPreviewToDraft: vi.fn(),
    clearChecklistPreview: vi.fn(),
    ...overrides,
  };
}

export function makeBoardRefs(
  overrides: Partial<BoardRefs> = {},
): BoardRefs {
  return {
    setChecklistInputRef: vi.fn(),
    focusChecklistInput: vi.fn(),
    ...overrides,
  };
}

export function makeTaskEditState(
  overrides: Partial<TaskEditState> = {},
): TaskEditState {
  return {
    taskEditModalOpen: false,
    editingTaskId: null,
    editTaskDraft: null,
    ...overrides,
  };
}

export function makeTaskEditActions(
  overrides: Partial<TaskEditActions> = {},
): TaskEditActions {
  return {
    setEditTaskDraft: vi.fn(),
    saveTaskEdit: vi.fn(),
    addEditChecklistItem: vi.fn(),
    updateEditChecklistItem: vi.fn(),
    deleteEditChecklistItem: vi.fn(),
    ...overrides,
  };
}

export function makeBoardDataState(
  overrides: Partial<BoardDataState> = {},
): BoardDataState {
  return {
    rows: [mockRow],
    columns: [mockColumn],
    tasks: [mockTask],
    boardLoaded: true,
    ...overrides,
  };
}

export function makeTaskActions(
  overrides: Partial<TaskActions> = {},
): TaskActions {
  return {
    startEditTask: vi.fn(),
    toggleTaskChecklist: vi.fn(),
    cancelEditTask: vi.fn(),
    deleteTask: vi.fn(),
    openTaskForm: vi.fn(),
    closeTaskCreateModal: vi.fn(),
    reorderTaskInCell: vi.fn(),
    moveTaskToColumn: vi.fn(),
    ...overrides,
  };
}

export function makeDragActions(
  overrides: Partial<DragActions> = {},
): DragActions {
  return {
    handleDragEnd: vi.fn(),
    handleTaskDragStart: vi.fn(() => vi.fn()),
    handleColumnDrop: vi.fn(() => vi.fn()),
    ...overrides,
  };
}

export function makeBaseBoardState() {
  return {
    startEditTask: vi.fn(),
    handleDragEnd: vi.fn(),
    handleTaskDragStart: vi.fn(() => vi.fn()),
    toggleTaskChecklist: vi.fn(),
    taskCreateModalOpen: false,
    taskDraft: mockTaskDraft,
    setTaskDraft: vi.fn(),
    createTask: vi.fn(),
    closeTaskCreateModal: vi.fn(),
    addChecklistItem: vi.fn(),
    updateChecklistItem: vi.fn(),
    deleteChecklistItem: vi.fn(),
    handleChecklistKeyDown: vi.fn(),
    setChecklistInputRef: vi.fn(),
    checklistPrompt: "",
    checklistPreview: [] as string[],
    isGeneratingChecklist: false,
    checklistModalError: "",
    setChecklistPrompt: vi.fn(),
    generateChecklistItems: vi.fn(),
    applyChecklistPreviewToDraft: vi.fn(),
    applyChecklistPreview: vi.fn(),
    clearChecklistPreview: vi.fn(),
    taskEditModalOpen: false,
    editTaskDraft: null,
    columns: [mockColumn],
    rows: [mockRow],
    cancelEditTask: vi.fn(),
    saveTaskEdit: vi.fn(),
    deleteTask: vi.fn(),
    setEditTaskDraft: vi.fn(),
    addEditChecklistItem: vi.fn(),
    updateEditChecklistItem: vi.fn(),
    deleteEditChecklistItem: vi.fn(),
  };
}
