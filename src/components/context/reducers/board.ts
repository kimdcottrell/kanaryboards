import type { BoardLifecycleAction, BoardState } from "../types.ts";
import { createId, emptyTaskDraft } from "../constants.ts";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export const createInitialState = (): BoardState => {
  return {
    rows: [],
    columns: [],
    tasks: [],
    boardLoaded: false,
    newRowName: "",
    newRowPrompt: "",
    newRowFormKey: 0,
    editingRowId: null,
    editingRowName: "",
    editingColumnId: null,
    editingColumnRowId: null,
    editingColumnName: "",
    taskCreateModalOpen: false,
    taskDraft: emptyTaskDraft("", ""),
    taskEditModalOpen: false,
    editingTaskId: null,
    editTaskDraft: null,
    checklistModalTaskId: null,
    checklistPrompt: "",
    checklistPreview: [],
    isGeneratingChecklist: false,
    checklistModalError: "",
    isGeneratingTasks: false,
    taskGenerationStatus: "",
    defaultColumnInput: "",
    draggedDefaultIndex: null,
    draggedTask: null,
  };
};

export function load(
  state: BoardState,
  payload: Extract<BoardLifecycleAction, { type: "BOARD/LOAD" }>["payload"],
): BoardState {
  const { rows, columns, tasks } = payload;
  return {
    ...state,
    rows: [...rows].sort((a, b) => a.order < b.order ? -1 : 1),
    columns: [...columns].sort((a, b) => a.order < b.order ? -1 : 1),
    tasks,
    boardLoaded: true,
  };
}

export function reset(): BoardState {
  const columnOrders = generateNKeysBetween(null, null, 3);
  return {
    ...createInitialState(),
    columns: ["To Do", "In Progress", "Done"].map((title, i) => ({
      id: createId(),
      title,
      order: columnOrders[i],
    })),
    rows: [{
      id: createId(),
      title: "Sample Project",
      color: "var(--color-row-blue)",
      order: generateKeyBetween(null, null),
    }],
    tasks: [],
    boardLoaded: true,
  };
}
