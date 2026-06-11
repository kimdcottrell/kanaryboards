import type { BoardState, TaskAction } from "../types.ts";
import { createId, emptyTaskDraft } from "../constants.ts";
import { generateKeyBetween } from "fractional-indexing";

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
        ? task.checklist
        : [{ id: createId(), text: "", checked: false }],
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
  if (!task || taskId === beforeTaskId) {
    return { ...state, draggedTask: null };
  }
  // Get sorted cell tasks without the moved task
  const cellTasks = state.tasks
    .filter((t) =>
      t.rowId === task.rowId && t.colId === task.colId && t.id !== taskId
    )
    .sort((a, b) => a.order < b.order ? -1 : 1);

  let newOrder: string;
  if (beforeTaskId === null) {
    const last = cellTasks[cellTasks.length - 1];
    newOrder = generateKeyBetween(last?.order ?? null, null);
  } else {
    const idx = cellTasks.findIndex((t) => t.id === beforeTaskId);
    if (idx === -1) return { ...state, draggedTask: null };
    const prev = cellTasks[idx - 1]?.order ?? null;
    const next = cellTasks[idx].order;
    newOrder = generateKeyBetween(prev, next);
  }

  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? { ...t, order: newOrder } : t
    ),
    draggedTask: null,
  };
}
