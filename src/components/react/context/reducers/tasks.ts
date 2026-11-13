import type { ChecklistItem, Column, Task } from "@lib/types.ts";
import type { BoardState } from "../types.ts";
import { createId, emptyTaskDraft } from "../constants.ts";
import { reorderKey } from "../ordering.ts";
import { findTodoColumnId } from "../selectors.ts";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export type TaskAction =
  | { type: "TASK/CREATE"; payload: { task: Task } }
  | { type: "TASK/DELETE"; payload: { taskId: string } }
  | {
    type: "TASK/SAVE_EDIT";
    payload: {
      edits: Pick<
        Task,
        "title" | "description" | "rowId" | "colId" | "checklist"
      >;
    };
  }
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

// Regenerate fractional orders for a loaded checklist, preserving its current
// array order. Guarantees valid keys even for tasks persisted before checklist
// items carried an `order`.
function withChecklistOrders(checklist: ChecklistItem[]): ChecklistItem[] {
  const orders = generateNKeysBetween(null, null, checklist.length);
  return checklist.map((item, i) => ({ ...item, order: orders[i] }));
}

// Moving into Trash stamps when and where from (kept on a Trash -> Trash move
// between rows); moving out clears both.
function withTrashState(prev: Task, next: Task, columns: Column[]): Task {
  const isTrash = (colId: string) =>
    columns.some((c) => c.id === colId && c.isTrash);
  if (!isTrash(next.colId)) {
    return { ...next, trashedAt: null, preTrashColId: null };
  }
  if (isTrash(prev.colId)) return next;
  return {
    ...next,
    trashedAt: new Date().toISOString(),
    preTrashColId: prev.colId,
  };
}

// Fractional key placing `taskId` at the end of the (rowId, colId) cell.
function endOfCellKey(
  state: BoardState,
  taskId: string,
  rowId: string,
  colId: string,
): string | null {
  const cellTasks = state.tasks.filter((t) =>
    t.rowId === rowId && t.colId === colId
  );
  return reorderKey(cellTasks, taskId, null);
}

const closedEditModal = {
  editingTaskId: null,
  editTaskDraft: null,
  taskEditModalOpen: false,
};

export function trash(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/TRASH" }>["payload"],
): BoardState {
  const task = state.tasks.find((t) => t.id === payload.taskId);
  const trashCol = state.columns.find((c) => c.isTrash);
  if (!task || !trashCol) return state;
  const order = endOfCellKey(state, task.id, task.rowId, trashCol.id);
  if (order === null) return state;
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === task.id
        ? withTrashState(t, { ...t, colId: trashCol.id, order }, state.columns)
        : t
    ),
    ...closedEditModal,
  };
}

export function restore(
  state: BoardState,
  payload: Extract<TaskAction, { type: "TASK/RESTORE" }>["payload"],
): BoardState {
  const task = state.tasks.find((t) => t.id === payload.taskId);
  if (!task) return state;
  // The pre-trash column may have been deleted since.
  const colId =
    state.columns.some((c) => c.id === task.preTrashColId && !c.isTrash)
      ? task.preTrashColId!
      : findTodoColumnId(state.columns.filter((c) => !c.isTrash));
  const order = endOfCellKey(state, task.id, task.rowId, colId);
  if (order === null) return state;
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === task.id
        ? withTrashState(t, { ...t, colId, order }, state.columns)
        : t
    ),
    ...closedEditModal,
  };
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

// payload.edits have passed /api/v1/validate (see actions/taskEdit.ts).
export function saveEdit(
  state: BoardState,
  { edits }: Extract<TaskAction, { type: "TASK/SAVE_EDIT" }>["payload"],
): BoardState {
  const draft = state.editTaskDraft;
  if (!draft) return state;
  // Deleted in another tab (BOARD/SYNC) while being edited: add it back at
  // the end of its cell rather than dropping the user's changes.
  const exists = state.tasks.some((t) => t.id === state.editingTaskId);
  const tasks = exists
    ? state.tasks.map((t) =>
      t.id === state.editingTaskId ? { ...t, ...edits } : t
    )
    : [
      ...state.tasks,
      {
        ...draft,
        ...edits,
        order: endOfCellKey(state, draft.id, edits.rowId, edits.colId)!,
      },
    ];
  return {
    ...state,
    tasks,
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
      t.id === payload.taskId
        ? withTrashState(t, { ...t, colId: payload.colId }, state.columns)
        : t
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
    // Without a column (e.g. the "new task" shortcut), default to the first.
    taskDraft: emptyTaskDraft(
      payload.rowId,
      payload.colId || (state.columns.find((c) => !c.isTrash)?.id ?? ""),
    ),
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
  if (
    state.draggedTask.rowId === toRowId &&
    state.draggedTask.colId === toColId
  ) {
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
        ? withTrashState(
          t,
          { ...t, rowId: toRowId, colId: toColId, order: newOrder },
          state.columns,
        )
        : t
    ),
    draggedTask: null,
  };
}
