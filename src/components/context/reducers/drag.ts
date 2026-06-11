import type { BoardState, DragAction } from "../types.ts";
import { generateKeyBetween } from "fractional-indexing";

export function startTask(
  state: BoardState,
  payload: Extract<DragAction, { type: "DRAG/START_TASK" }>["payload"],
): BoardState {
  return { ...state, draggedTask: payload.task };
}

export function endTask(state: BoardState): BoardState {
  return { ...state, draggedTask: null };
}

export function dropTask(
  state: BoardState,
  payload: Extract<DragAction, { type: "DRAG/DROP_TASK" }>["payload"],
): BoardState {
  const { toRowId, toColId } = payload;
  if (!state.draggedTask) return state;
  if (state.draggedTask.rowId !== toRowId) {
    return { ...state, draggedTask: null };
  }
  if (state.draggedTask.colId === toColId) {
    return { ...state, draggedTask: null };
  }
  // Append to the end of the target cell
  const cellTasks = state.tasks
    .filter((t) => t.rowId === toRowId && t.colId === toColId)
    .sort((a, b) => a.order < b.order ? -1 : 1);
  const lastOrder = cellTasks[cellTasks.length - 1]?.order ?? null;
  const newOrder = generateKeyBetween(lastOrder, null);
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === state.draggedTask!.id
        ? { ...t, colId: toColId, order: newOrder }
        : t
    ),
    draggedTask: null,
  };
}

export function setDefaultIndex(
  state: BoardState,
  payload: Extract<
    DragAction,
    { type: "DRAG/SET_DEFAULT_INDEX" }
  >["payload"],
): BoardState {
  return { ...state, draggedDefaultIndex: payload.index };
}
