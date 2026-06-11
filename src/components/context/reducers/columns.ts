import type { BoardState, ColumnAction } from "../types.ts";
import { generateKeyBetween } from "fractional-indexing";

export function add(
  state: BoardState,
  payload: Extract<ColumnAction, { type: "COLUMN/ADD" }>["payload"],
): BoardState {
  return { ...state, columns: [...state.columns, payload] };
}

export function remove(
  state: BoardState,
  payload: Extract<ColumnAction, { type: "COLUMN/DELETE" }>["payload"],
): BoardState {
  const { columnId } = payload;
  let next: BoardState = {
    ...state,
    columns: state.columns.filter((c) => c.id !== columnId),
    tasks: state.tasks.filter((t) => t.colId !== columnId),
  };
  if (state.taskCreateModalOpen && state.taskDraft.colId === columnId) {
    next = { ...next, taskCreateModalOpen: false };
  }
  if (state.editingTaskId) {
    const editing = state.tasks.find((t) => t.id === state.editingTaskId);
    if (editing?.colId === columnId) {
      next = {
        ...next,
        editingTaskId: null,
        editTaskDraft: null,
        taskEditModalOpen: false,
      };
    }
  }
  return next;
}

export function reorder(
  state: BoardState,
  payload: Extract<ColumnAction, { type: "COLUMN/REORDER" }>["payload"],
): BoardState {
  const { columnId, beforeColumnId } = payload;
  const col = state.columns.find((c) => c.id === columnId);
  if (!col) return state;
  const without = state.columns.filter((c) => c.id !== columnId);
  if (beforeColumnId === null) {
    const last = without[without.length - 1];
    const newOrder = generateKeyBetween(last?.order ?? null, null);
    return { ...state, columns: [...without, { ...col, order: newOrder }] };
  }
  const idx = without.findIndex((c) => c.id === beforeColumnId);
  if (idx === -1) return state;
  const prev = without[idx - 1]?.order ?? null;
  const next = without[idx].order;
  const newOrder = generateKeyBetween(prev, next);
  const result = [...without];
  result.splice(idx, 0, { ...col, order: newOrder });
  return { ...state, columns: result };
}

export function setInput(
  state: BoardState,
  payload: Extract<ColumnAction, { type: "COLUMN/SET_INPUT" }>["payload"],
): BoardState {
  return { ...state, defaultColumnInput: payload.value };
}

export function setDraggedIndex(
  state: BoardState,
  payload: Extract<
    ColumnAction,
    { type: "COLUMN/SET_DRAGGED_INDEX" }
  >["payload"],
): BoardState {
  return { ...state, draggedDefaultIndex: payload.index };
}

export function renameStart(
  state: BoardState,
  payload: Extract<ColumnAction, { type: "COLUMN/RENAME_START" }>["payload"],
): BoardState {
  return {
    ...state,
    editingColumnId: payload.columnId,
    editingColumnRowId: payload.rowId,
    editingColumnName: payload.currentName,
  };
}

export function renameChange(
  state: BoardState,
  payload: Extract<ColumnAction, { type: "COLUMN/RENAME_CHANGE" }>["payload"],
): BoardState {
  return { ...state, editingColumnName: payload.name };
}

export function renameSave(
  state: BoardState,
  payload: Extract<ColumnAction, { type: "COLUMN/RENAME_SAVE" }>["payload"],
): BoardState {
  const trimmed = state.editingColumnName.trim();
  if (!trimmed) return { ...state, editingColumnId: null };
  return {
    ...state,
    columns: state.columns.map((c) =>
      c.id === payload.columnId ? { ...c, title: trimmed } : c
    ),
    editingColumnId: null,
    editingColumnRowId: null,
  };
}

export function renameCancel(state: BoardState): BoardState {
  return {
    ...state,
    editingColumnId: null,
    editingColumnRowId: null,
    editingColumnName: "",
  };
}
