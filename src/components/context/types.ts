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
  pinnedToShortcut: boolean;
  pinnedToDock: boolean;
  icon: string | null;
  iconInBoardMenu: boolean;
  iconNearColumnTitle: boolean;
  isTrash: boolean;
}

export interface Task {
  id: string;
  rowId: string;
  colId: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  order: string;
  trashedAt: string | null; // ISO timestamp; set while in the Trash column
  preTrashColId: string | null; // column to return to on Restore
}

// What BOARD/LOAD accepts: boards saved before the column pin/icon fields or
// the Trash column existed lack them, and load() backfills them.
export type StoredColumn =
  & Pick<Column, "id" | "title" | "order">
  & Partial<Column>;
export type StoredTask =
  & Omit<Task, "trashedAt" | "preTrashColId">
  & Partial<Task>;

// Stored outside the board blob (one KV entry per comment), so it is not part
// of PersistedBoard. Mirrors the task_comments table in src/db/schema.dbml.
export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string | null; // Clerk userId; null when stored in localStorage
  authorName: string;
  authorImageUrl: string | null;
  content: string; // Lexical JSON from ExtensiveEditorRef.getJSON()
  createdAt: string; // ISO timestamp
  updatedAt: string | null; // ISO timestamp; set once the comment is edited
}

// ── BOARD STATE ────────────────────────────────────────────────────────────────

// Persisted board model: rows, columns, tasks, and load status.
export interface BoardData {
  rows: Row[];
  columns: Column[];
  tasks: Task[];
  boardLoaded: boolean;
}

// "Create a new row" form, including AI task generation (CreateRowSection),
// and the dedicated modal it lives in (CreateRowModal).
export interface RowFormState {
  newRowName: string;
  newRowPrompt: string;
  newRowFormKey: number;
  isGeneratingTasks: boolean;
  taskGenerationStatus: string;
  taskGenerationFailed: boolean;
  createRowModalOpen: boolean;
}

// Inline row title editing (RowSection).
export interface RowEditState {
  editingRowId: string | null;
  editingRowName: string;
}

// Inline column title editing (ColumnSection).
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

// Board configuration modal (BoardConfigModal). boardConfigScrollTarget is the
// id of an element to scroll into view after the modal opens (e.g. opening it
// from "Add new column to all rows" jumps to #create-new-column); null = top.
export interface BoardConfigState {
  boardConfigModalOpen: boolean;
  boardConfigScrollTarget: string | null;
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
// because ColumnSection reads it to render drag visuals and route drops.
export interface DragState {
  draggedTask: Task | null;
}

// Ephemeral view filter: which pinned columns are selected from the BoardMenu.
// Empty = show all columns. Not persisted (excluded from the autosave snapshot).
export interface ColumnFilterState {
  selectedColumnIds: string[];
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
  & DragState
  & ColumnFilterState;

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
  | { type: "COLUMN/TOGGLE_PIN_SHORTCUT"; payload: { columnId: string } }
  | { type: "COLUMN/TOGGLE_PIN_DOCK"; payload: { columnId: string } }
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
  | { type: "ROW/RESET_FORM" }
  | { type: "ROW/OPEN_CREATE_MODAL" }
  | { type: "ROW/CLOSE_CREATE_MODAL" };

export type TaskAction =
  | { type: "TASK/CREATE"; payload: { task: Task } }
  | { type: "TASK/DELETE"; payload: { taskId: string } }
  | { type: "TASK/SAVE_EDIT" }
  | { type: "TASK/MOVE_TO_COLUMN"; payload: { taskId: string; colId: string } }
  | { type: "TASK/TRASH"; payload: { taskId: string } }
  | { type: "TASK/RESTORE"; payload: { taskId: string } }
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
  | { type: "BOARD_CONFIG/OPEN_MODAL"; payload?: { scrollTarget?: string } }
  | { type: "BOARD_CONFIG/CLOSE_MODAL" };

export type ViewAction = {
  type: "VIEW/TOGGLE_COLUMN_FILTER";
  payload: { columnId: string };
};

export type BoardLifecycleAction =
  | { type: "BOARD/RESET" }
  | {
    type: "BOARD/LOAD";
    payload: {
      rows: Row[];
      columns: StoredColumn[];
      tasks: StoredTask[];
    };
  }
  // Another tab's autosaved board, received over BroadcastChannel.
  | {
    type: "BOARD/SYNC";
    payload: { rows: Row[]; columns: Column[]; tasks: Task[] };
  };

export type BoardAction =
  | ColumnAction
  | RowAction
  | TaskAction
  | ChecklistAction
  | ChecklistAIAction
  | TaskAIAction
  | BoardConfigAction
  | BoardLifecycleAction
  | ViewAction;
