import type { PersistedBoard, Task } from "@lib/types.ts";

// Persisted board model: rows, columns, tasks, and load status.
export interface BoardData extends PersistedBoard {
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
