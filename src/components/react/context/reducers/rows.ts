import type { BoardState } from "../types.ts";
import { generateKeyBetween } from "fractional-indexing";

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
  | { type: "ROW/EDIT_SAVE"; payload: { rowId: string; title: string } }
  | { type: "ROW/EDIT_CANCEL" }
  | { type: "ROW/RENAME"; payload: { rowId: string; name: string } }
  | { type: "ROW/SET_NEW_NAME"; payload: { name: string } }
  | { type: "ROW/SET_NEW_PROMPT"; payload: { prompt: string } }
  | { type: "ROW/RESET_FORM" }
  | { type: "ROW/OPEN_CREATE_MODAL" }
  | { type: "ROW/CLOSE_CREATE_MODAL" };

export function add(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/ADD" }>["payload"],
): BoardState {
  return { ...state, rows: [...state.rows, payload] };
}

export function remove(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/DELETE" }>["payload"],
): BoardState {
  const { rowId } = payload;
  let next: BoardState = {
    ...state,
    rows: state.rows.filter((r) => r.id !== rowId),
    tasks: state.tasks.filter((t) => t.rowId !== rowId),
  };
  if (state.taskCreateModalOpen && state.taskDraft.rowId === rowId) {
    next = { ...next, taskCreateModalOpen: false };
  }
  if (state.editingTaskId) {
    const editing = state.tasks.find((t) => t.id === state.editingTaskId);
    if (editing?.rowId === rowId) {
      next = {
        ...next,
        editingTaskId: null,
        editTaskDraft: null,
        taskEditModalOpen: false,
      };
    }
  }
  if (state.editingRowId === rowId) {
    next = { ...next, editingRowId: null, editingRowName: "" };
  }
  return next;
}

export function move(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/MOVE" }>["payload"],
): BoardState {
  const { fromIndex, toIndex } = payload;
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    toIndex >= state.rows.length
  ) {
    return state;
  }
  const next = [...state.rows];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  const prev = next[toIndex - 1]?.order ?? null;
  const after = next[toIndex + 1]?.order ?? null;
  next[toIndex] = { ...moved, order: generateKeyBetween(prev, after) };
  return { ...state, rows: next };
}

export function updateColor(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/UPDATE_COLOR" }>["payload"],
): BoardState {
  return {
    ...state,
    rows: state.rows.map((r) =>
      r.id === payload.rowId ? { ...r, color: payload.color } : r
    ),
  };
}

export function editStart(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/EDIT_START" }>["payload"],
): BoardState {
  return {
    ...state,
    editingRowId: payload.rowId,
    editingRowName: payload.currentName,
  };
}

export function editChange(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/EDIT_CHANGE" }>["payload"],
): BoardState {
  return { ...state, editingRowName: payload.name };
}

export function editSave(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/EDIT_SAVE" }>["payload"],
): BoardState {
  // payload.title has passed /api/v1/validate (see actions/rowEdit.ts).
  return {
    ...state,
    rows: state.rows.map((r) =>
      r.id === payload.rowId ? { ...r, title: payload.title } : r
    ),
    editingRowId: null,
  };
}

export function editCancel(state: BoardState): BoardState {
  return { ...state, editingRowId: null, editingRowName: "" };
}

export function rename(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/RENAME" }>["payload"],
): BoardState {
  // payload.name has passed /api/v1/validate (see actions/row.ts).
  return {
    ...state,
    rows: state.rows.map((r) =>
      r.id === payload.rowId ? { ...r, title: payload.name } : r
    ),
  };
}

export function setNewName(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/SET_NEW_NAME" }>["payload"],
): BoardState {
  return { ...state, newRowName: payload.name };
}

export function setNewPrompt(
  state: BoardState,
  payload: Extract<RowAction, { type: "ROW/SET_NEW_PROMPT" }>["payload"],
): BoardState {
  return { ...state, newRowPrompt: payload.prompt };
}

export function resetForm(state: BoardState): BoardState {
  return {
    ...state,
    newRowName: "",
    newRowPrompt: "",
    newRowFormKey: state.newRowFormKey + 1,
  };
}

export function openRowCreateModal(state: BoardState): BoardState {
  return { ...state, createRowModalOpen: true };
}

export function closeRowCreateModal(state: BoardState): BoardState {
  return {
    ...state,
    createRowModalOpen: false,
    taskGenerationStatus: "",
    taskGenerationFailed: false,
  };
}
