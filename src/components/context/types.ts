export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Row {
  id: string;
  name: string;
  color: string;
}

export interface Column {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  rowId: string;
  colId: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
}

export interface TaskDraft {
  title: string;
  description: string | object;
  checklist: ChecklistItem[];
  rowId: string;
  colId: string;
}

export interface DraggedTask {
  taskId: string;
  rowId: string;
  colId: string;
}

export interface BoardState {
  // Persistent
  rows: Row[];
  columns: Column[];
  tasks: Task[];
  defaultColumnNames: string[];
  // Loading
  boardLoaded: boolean;
  // Ephemeral
  newRowName: string;
  newRowPrompt: string;
  newRowFormKey: number;
  editingRowId: string | null;
  editingRowName: string;
  editingColumnId: string | null;
  editingColumnRowId: string | null;
  editingColumnName: string;
  taskCreateModalOpen: boolean;
  taskDraft: TaskDraft;
  taskEditModalOpen: boolean;
  editingTaskId: string | null;
  editTaskDraft: Task | null;
  checklistModalTaskId: string | null;
  checklistPrompt: string;
  checklistPreview: string[];
  isGeneratingChecklist: boolean;
  checklistModalError: string;
  isGeneratingTasks: boolean;
  taskGenerationStatus: string;
  defaultColumnInput: string;
  draggedDefaultIndex: number | null;
  draggedTask: DraggedTask | null;
}

export type BoardAction =
  // Columns
  | { type: "COLUMN/SET_DEFAULT_NAMES"; payload: { names: string[] } }
  | { type: "COLUMN/ADD_DEFAULT"; payload: { name: string } }
  | { type: "COLUMN/REMOVE_DEFAULT"; payload: { name: string } }
  | {
    type: "COLUMN/MOVE_DEFAULT";
    payload: { fromIndex: number; toIndex: number };
  }
  | { type: "COLUMN/DELETE"; payload: { columnId: string } }
  | { type: "COLUMN/SET_INPUT"; payload: { value: string } }
  | { type: "COLUMN/SET_DRAGGED_INDEX"; payload: { index: number | null } }
  | {
    type: "COLUMN/RENAME_START";
    payload: { columnId: string; rowId: string; currentName: string };
  }
  | { type: "COLUMN/RENAME_CHANGE"; payload: { name: string } }
  | { type: "COLUMN/RENAME_SAVE"; payload: { columnId: string } }
  | { type: "COLUMN/RENAME_CANCEL" }
  // Rows
  | { type: "ROW/ADD"; payload: { id: string; name: string; color: string } }
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
  // Tasks
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
  | { type: "TASK/UPDATE_DRAFT"; payload: { draft: TaskDraft } }
  | { type: "TASK/UPDATE_EDIT_DRAFT"; payload: { draft: Task } }
  // Checklist items (target discriminates create-draft vs edit-draft)
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
  // Checklist AI
  | { type: "CHECKLIST_AI/SET_PROMPT"; payload: { prompt: string } }
  | { type: "CHECKLIST_AI/GENERATE_START"; payload: { taskId: string | null } }
  | { type: "CHECKLIST_AI/GENERATE_SUCCESS"; payload: { items: string[] } }
  | { type: "CHECKLIST_AI/GENERATE_FAILURE"; payload: { error: string } }
  | { type: "CHECKLIST_AI/APPLY_TO_EDIT_DRAFT" }
  | { type: "CHECKLIST_AI/APPLY_TO_CREATE_DRAFT" }
  | { type: "CHECKLIST_AI/RESET" }
  // Task AI
  | { type: "TASK_AI/GENERATE_START" }
  | { type: "TASK_AI/GENERATE_SUCCESS"; payload: { tasks: Task[] } }
  | { type: "TASK_AI/GENERATE_FAILURE"; payload: { error: string } }
  // Drag
  | {
    type: "DRAG/START_TASK";
    payload: { taskId: string; rowId: string; colId: string };
  }
  | { type: "DRAG/END_TASK" }
  | { type: "DRAG/DROP_TASK"; payload: { toRowId: string; toColId: string } }
  | { type: "DRAG/SET_DEFAULT_INDEX"; payload: { index: number | null } }
  // Task reorder
  | {
    type: "TASK/REORDER_IN_CELL";
    payload: { taskId: string; beforeTaskId: string | null };
  }
  // Board
  | { type: "BOARD/RESET" }
  | {
    type: "BOARD/LOAD";
    payload: {
      rows: Row[];
      columns: Column[];
      tasks: Task[];
      defaultColumnNames: string[];
    };
  };
