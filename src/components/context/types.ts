export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Row {
  id: string;
  title: string;
  color: string;
  order: string;
}

export interface Column {
  id: string;
  title: string;
  order: string;
}

export interface Task {
  id: string;
  rowId: string;
  colId: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  order: string;
}

// ── BOARD STATE ────────────────────────────────────────────────────────────────

// Persisted board model: rows, columns, tasks, and load status.
export interface BoardData {
  rows: Row[];
  columns: Column[];
  tasks: Task[];
  boardLoaded: boolean;
}

// "Create a new row" form, including AI task generation (BoardConfiguration).
export interface RowFormState {
  newRowName: string;
  newRowPrompt: string;
  newRowFormKey: number;
  isGeneratingTasks: boolean;
  taskGenerationStatus: string;
}

// Inline row title editing (RowSection).
export interface RowEditState {
  editingRowId: string | null;
  editingRowName: string;
}

// Inline column title editing (ColumnCard).
export interface ColumnEditState {
  editingColumnId: string | null;
  editingColumnRowId: string | null;
  editingColumnName: string;
}

// Default-column management: input field and drag reordering (BoardConfiguration).
export interface ColumnConfigState {
  defaultColumnInput: string;
  draggedDefaultIndex: number | null;
}

// Task creation modal (TaskCreateModal).
export interface TaskCreateState {
  taskCreateModalOpen: boolean;
  taskDraft: Task;
}

// Task edit modal (TaskEditModal).
export interface TaskEditState {
  taskEditModalOpen: boolean;
  editingTaskId: string | null;
  editTaskDraft: Task | null;
}

// AI checklist generation, shared by the create and edit task modals.
export interface ChecklistAIState {
  checklistModalTaskId: string | null;
  checklistPrompt: string;
  checklistPreview: string[];
  isGeneratingChecklist: boolean;
  checklistModalError: string;
}

// Task drag-and-drop across the board.
export interface DragState {
  draggedTask: Task | null;
}

export type BoardState =
  & BoardData
  & RowFormState
  & RowEditState
  & ColumnEditState
  & ColumnConfigState
  & TaskCreateState
  & TaskEditState
  & ChecklistAIState
  & DragState;

// ── BOARD ACTIONS ──────────────────────────────────────────────────────────────

export type ColumnAction =
  | {
    type: "COLUMN/ADD";
    payload: { id: string; title: string; order: string };
  }
  | { type: "COLUMN/DELETE"; payload: { columnId: string } }
  | {
    type: "COLUMN/REORDER";
    payload: { columnId: string; beforeColumnId: string | null };
  }
  | { type: "COLUMN/SET_INPUT"; payload: { value: string } }
  | { type: "COLUMN/SET_DRAGGED_INDEX"; payload: { index: number | null } }
  | {
    type: "COLUMN/RENAME_START";
    payload: { columnId: string; rowId: string; currentName: string };
  }
  | { type: "COLUMN/RENAME_CHANGE"; payload: { name: string } }
  | { type: "COLUMN/RENAME_SAVE"; payload: { columnId: string } }
  | { type: "COLUMN/RENAME_CANCEL" };

export type RowAction =
  | {
    type: "ROW/ADD";
    payload: { id: string; title: string; color: string; order: string };
  }
  | { type: "ROW/DELETE"; payload: { rowId: string } }
  | { type: "ROW/MOVE"; payload: { fromIndex: number; toIndex: number } }
  | { type: "ROW/UPDATE_COLOR"; payload: { rowId: string; color: string } }
  | { type: "ROW/EDIT_START"; payload: { rowId: string; currentName: string } }
  | { type: "ROW/EDIT_CHANGE"; payload: { name: string } }
  | { type: "ROW/EDIT_SAVE"; payload: { rowId: string } }
  | { type: "ROW/EDIT_CANCEL" }
  | { type: "ROW/RENAME"; payload: { rowId: string; name: string } }
  | { type: "ROW/SET_NEW_NAME"; payload: { name: string } }
  | { type: "ROW/SET_NEW_PROMPT"; payload: { prompt: string } }
  | { type: "ROW/RESET_FORM" };

export type TaskAction =
  | { type: "TASK/CREATE"; payload: { task: Task } }
  | { type: "TASK/DELETE"; payload: { taskId: string } }
  | { type: "TASK/SAVE_EDIT" }
  | { type: "TASK/MOVE_TO_COLUMN"; payload: { taskId: string; colId: string } }
  | {
    type: "TASK/TOGGLE_CHECKLIST_ITEM";
    payload: { taskId: string; itemId: string };
  }
  | {
    type: "TASK/OPEN_CREATE_MODAL";
    payload: { rowId: string; colId: string };
  }
  | { type: "TASK/CLOSE_CREATE_MODAL" }
  | { type: "TASK/OPEN_EDIT_MODAL"; payload: { task: Task } }
  | { type: "TASK/CLOSE_EDIT_MODAL" }
  | { type: "TASK/UPDATE_DRAFT"; payload: { draft: Task } }
  | { type: "TASK/UPDATE_EDIT_DRAFT"; payload: { draft: Task } }
  | {
    type: "TASK/REORDER_IN_CELL";
    payload: { taskId: string; beforeTaskId: string | null };
  };

// Checklist item edits (target discriminates create-draft vs edit-draft).
export type ChecklistAction =
  | {
    type: "CHECKLIST/ADD_ITEM";
    payload: {
      target: "draft" | "editDraft";
      item: ChecklistItem;
      insertBeforeIndex?: number;
    };
  }
  | {
    type: "CHECKLIST/UPDATE_ITEM";
    payload: {
      target: "draft" | "editDraft";
      itemId: string;
      field: "text" | "checked";
      value: string | boolean;
    };
  }
  | {
    type: "CHECKLIST/DELETE_ITEM";
    payload: { target: "draft" | "editDraft"; itemId: string };
  };

export type ChecklistAIAction =
  | { type: "CHECKLIST_AI/SET_PROMPT"; payload: { prompt: string } }
  | { type: "CHECKLIST_AI/GENERATE_START"; payload: { taskId: string | null } }
  | { type: "CHECKLIST_AI/GENERATE_SUCCESS"; payload: { items: string[] } }
  | { type: "CHECKLIST_AI/GENERATE_FAILURE"; payload: { error: string } }
  | { type: "CHECKLIST_AI/APPLY_TO_EDIT_DRAFT" }
  | { type: "CHECKLIST_AI/APPLY_TO_CREATE_DRAFT" }
  | { type: "CHECKLIST_AI/RESET" };

export type TaskAIAction =
  | { type: "TASK_AI/GENERATE_START" }
  | { type: "TASK_AI/GENERATE_SUCCESS"; payload: { tasks: Task[] } }
  | { type: "TASK_AI/GENERATE_FAILURE"; payload: { error: string } };

export type DragAction =
  | { type: "DRAG/START_TASK"; payload: { task: Task } }
  | { type: "DRAG/END_TASK" }
  | { type: "DRAG/DROP_TASK"; payload: { toRowId: string; toColId: string } }
  | { type: "DRAG/SET_DEFAULT_INDEX"; payload: { index: number | null } };

export type BoardLifecycleAction =
  | { type: "BOARD/RESET" }
  | {
    type: "BOARD/LOAD";
    payload: {
      rows: Row[];
      columns: Column[];
      tasks: Task[];
    };
  };

export type BoardAction =
  | ColumnAction
  | RowAction
  | TaskAction
  | ChecklistAction
  | ChecklistAIAction
  | TaskAIAction
  | DragAction
  | BoardLifecycleAction;
