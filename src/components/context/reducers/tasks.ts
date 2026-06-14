import type { BoardState, ChecklistItem, TaskAction } from "../types.ts";
import { createId, emptyTaskDraft } from "../constants.ts";
import { reorderKey } from "../ordering.ts";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

// Regenerate fractional orders for a loaded checklist, preserving its current
// array order. Guarantees valid keys even for tasks persisted before checklist
// items carried an `order`.
function withChecklistOrders(checklist: ChecklistItem[]): ChecklistItem[] {
  const orders = generateNKeysBetween(null, null, checklist.length);
  return checklist.map((item, i) => ({ ...item, order: orders[i] }));
}

export function create(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/CREATE" }>["payload"],
): BoardState {
  return {
    ...state,
    tasks: [payload.task, ...state.tasks],
    taskCreateModalOpen: false,
    checklistModalTaskId: null,
    checklistPrompt: "",
    checklistPreview: [],
    checklistModalError: "",
  };
}

export function remove(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/DELETE" }>["payload"],
): BoardState {
  const next: BoardState = {
    ...state,
    tasks: state.tasks.filter((t) => t.id !== payload.taskId),
  };
  if (state.editingTaskId === payload.taskId) {
    return {
      ...next,
      editingTaskId: null,
      editTaskDraft: null,
      taskEditModalOpen: false,
    };
  }
  return next;
}

export function saveEdit(state: BoardState): BoardState {
  if (!state.editTaskDraft?.title.trim()) return state;
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === state.editingTaskId
        ? {
          ...t,
          title: state.editTaskDraft!.title.trim(),
          description: state.editTaskDraft!.description,
          rowId: state.editTaskDraft!.rowId,
          colId: state.editTaskDraft!.colId,
          checklist: state.editTaskDraft!.checklist.filter((i) =>
            i.text.trim()
          ),
        }
        : t
    ),
    editingTaskId: null,
    editTaskDraft: null,
    taskEditModalOpen: false,
  };
}

export function moveToColumn(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/MOVE_TO_COLUMN" }>["payload"],
): BoardState {
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === payload.taskId ? { ...t, colId: payload.colId } : t
    ),
  };
}

export function toggleChecklistItem(
  state: BoardState,
  payload: Extract<
    TaskAction,
    { type: "TASK/TOGGLE_CHECKLIST_ITEM" }
  >["payload"],
): BoardState {
  return {
    ...state,
    tasks: state.tasks.map((t) => {
      if (t.id !== payload.taskId) return t;
      return {
        ...t,
        checklist: t.checklist.map((item) =>
          item.id === payload.itemId
            ? { ...item, checked: !item.checked }
            : item
        ),
      };
    }),
  };
}

export function openCreateModal(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/OPEN_CREATE_MODAL" }>["payload"],
): BoardState {
  return {
    ...state,
    taskCreateModalOpen: true,
    taskDraft: emptyTaskDraft(payload.rowId, payload.colId),
    checklistModalTaskId: null,
    checklistPrompt: "",
    checklistPreview: [],
    checklistModalError: "",
  };
}

export function closeCreateModal(state: BoardState): BoardState {
  return {
    ...state,
    taskCreateModalOpen: false,
    checklistModalTaskId: null,
    checklistPrompt: "",
    checklistPreview: [],
    checklistModalError: "",
  };
}

export function openEditModal(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/OPEN_EDIT_MODAL" }>["payload"],
): BoardState {
  const { task } = payload;
  return {
    ...state,
    editingTaskId: task.id,
    editTaskDraft: {
      ...task,
      checklist: task.checklist.length
        ? withChecklistOrders(task.checklist)
        : [{
          id: createId(),
          text: "",
          checked: false,
          order: generateKeyBetween(null, null),
        }],
    },
    taskEditModalOpen: true,
  };
}

export function closeEditModal(state: BoardState): BoardState {
  return {
    ...state,
    editingTaskId: null,
    editTaskDraft: null,
    taskEditModalOpen: false,
  };
}

export function updateDraft(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/UPDATE_DRAFT" }>["payload"],
): BoardState {
  return { ...state, taskDraft: payload.draft };
}

export function updateEditDraft(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/UPDATE_EDIT_DRAFT" }>["payload"],
): BoardState {
  return { ...state, editTaskDraft: payload.draft };
}

export function reorderInCell(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/REORDER_IN_CELL" }>["payload"],
): BoardState {
  const { taskId, beforeTaskId } = payload;
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return { ...state, draggedTask: null };

  const cellTasks = state.tasks.filter((t) =>
    t.rowId === task.rowId && t.colId === task.colId
  );
  const newOrder = reorderKey(cellTasks, taskId, beforeTaskId);
  if (newOrder === null) return { ...state, draggedTask: null };

  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? { ...t, order: newOrder } : t
    ),
    draggedTask: null,
  };
}

export function startDrag(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/START_DRAG" }>["payload"],
): BoardState {
  return { ...state, draggedTask: payload.task };
}

export function endDrag(state: BoardState): BoardState {
  return { ...state, draggedTask: null };
}

export function dropOnCell(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/DROP_ON_CELL" }>["payload"],
): BoardState {
  const { toRowId, toColId, beforeTaskId } = payload;
  if (!state.draggedTask) return state;
  if (state.draggedTask.rowId !== toRowId) {
    return { ...state, draggedTask: null };
  }
  if (state.draggedTask.colId === toColId) {
    return { ...state, draggedTask: null };
  }
  const cellTasks = state.tasks.filter((t) =>
    t.rowId === toRowId && t.colId === toColId
  );
  const newOrder = reorderKey(cellTasks, state.draggedTask.id, beforeTaskId);
  if (newOrder === null) return { ...state, draggedTask: null };
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
