export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  order: string;
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
  pinned: boolean;
  icon: string | null;
  iconInBoardMenu: boolean;
  iconNearColumnTitle: boolean;
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

// "Create a new row" form, including AI task generation (CreateRowSection).
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

// Default-column management: input field and drag reordering (ColumnSettingsSection).
export interface ColumnConfigState {
  defaultColumnInput: string;
  defaultColumnIcon: string | null;
  draggedDefaultIndex: number | null;
}

// Board configuration modal (BoardConfigModal).
export interface BoardConfigState {
  boardConfigModalOpen: boolean;
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

// The task currently being dragged across the board (cross-cell moves). Global
// because ColumnCard reads it to render drag visuals and route drops.
export interface DragState {
  draggedTask: Task | null;
}

export type BoardState =
  & BoardData
  & RowFormState
  & RowEditState
  & ColumnEditState
  & ColumnConfigState
  & BoardConfigState
  & TaskCreateState
  & TaskEditState
  & ChecklistAIState
  & DragState;

// ── BOARD ACTIONS ──────────────────────────────────────────────────────────────

export type ColumnAction =
  | {
    type: "COLUMN/ADD";
    payload: { id: string; title: string; order: string; icon: string | null };
  }
  | { type: "COLUMN/DELETE"; payload: { columnId: string } }
  | {
    type: "COLUMN/REORDER";
    payload: { columnId: string; beforeColumnId: string | null };
  }
  | { type: "COLUMN/SET_INPUT"; payload: { value: string } }
  | { type: "COLUMN/SET_ICON"; payload: { icon: string | null } }
  | {
    type: "COLUMN/SET_COLUMN_ICON";
    payload: { columnId: string; icon: string | null };
  }
  | { type: "COLUMN/SET_DRAGGED_INDEX"; payload: { index: number | null } }
  | {
    type: "COLUMN/RENAME_START";
    payload: { columnId: string; rowId: string | null; currentName: string };
  }
  | { type: "COLUMN/RENAME_CHANGE"; payload: { name: string } }
  | { type: "COLUMN/RENAME_SAVE"; payload: { columnId: string } }
  | { type: "COLUMN/RENAME_CANCEL" }
  | { type: "COLUMN/TOGGLE_PIN"; payload: { columnId: string } }
  | { type: "COLUMN/TOGGLE_ICON_IN_BOARD_MENU"; payload: { columnId: string } }
  | {
    type: "COLUMN/TOGGLE_ICON_NEAR_COLUMN_TITLE";
    payload: { columnId: string };
  };

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
  // Task drag-and-drop spans 4 actions because dragging a task is a board-wide
  // gesture: draggedTask lives in global BoardState so any column can render
  // drop-zone highlights mid-drag, and a task can land in a different cell than
  // it started in.
  //   START_DRAG / END_DRAG - bookend the gesture (END_DRAG also acts as a
  //                           cancel safety-net if no reorder/drop happened)
  //   REORDER_IN_CELL       - same-cell reorder, precise before/after position
  //   DROP_ON_CELL          - move to a different column, at the drop-indicator
  //                           position (or appended to the end if none)
  | {
    type: "TASK/REORDER_IN_CELL";
    payload: { taskId: string; beforeTaskId: string | null };
  }
  | { type: "TASK/START_DRAG"; payload: { task: Task } }
  | { type: "TASK/END_DRAG" }
  | {
    type: "TASK/DROP_ON_CELL";
    payload: { toRowId: string; toColId: string; beforeTaskId: string | null };
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
  }
  // Unlike task drag-and-drop, checklist items only ever reorder within one
  // fixed list local to a single draft, so drag state stays local to
  // ChecklistSection and this single action (dispatched on drop) is enough to
  // record the final position.
  | {
    type: "CHECKLIST/REORDER_ITEM";
    payload: {
      target: "draft" | "editDraft";
      itemId: string;
      beforeItemId: string | null;
    };
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

export type BoardConfigAction =
  | { type: "BOARD_CONFIG/OPEN_MODAL" }
  | { type: "BOARD_CONFIG/CLOSE_MODAL" };

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
  | BoardConfigAction
  | BoardLifecycleAction;
