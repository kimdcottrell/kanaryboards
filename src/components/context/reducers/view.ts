import type { BoardState, ViewAction } from "../types.ts";

export function toggleColumnFilter(
  state: BoardState,
  payload: Extract<ViewAction, { type: "VIEW/TOGGLE_COLUMN_FILTER" }>["payload"],
): BoardState {
  const selected = state.selectedColumnIds.includes(payload.columnId)
    ? state.selectedColumnIds.filter((id) => id !== payload.columnId)
    : [...state.selectedColumnIds, payload.columnId];
  return { ...state, selectedColumnIds: selected };
}
