import type { BoardAction, BoardState, ChecklistItem } from "./types.ts";
import { createId, emptyTaskDraft } from "./constants.ts";
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

const mutateChecklist = (
  list: ChecklistItem[],
  op: "add" | "update" | "delete",
  payload: {
    item?: ChecklistItem;
    insertBeforeIndex?: number;
    itemId?: string;
    field?: string;
    value?: string | boolean;
  },
): ChecklistItem[] => {
  if (op === "add") {
    const next = [...list];
    if (payload.insertBeforeIndex !== undefined) {
      next.splice(payload.insertBeforeIndex, 0, payload.item!);
    } else {
      next.unshift(payload.item!);
    }
    return next;
  }
  if (op === "update") {
    return list.map((item) =>
      item.id === payload.itemId
        ? { ...item, [payload.field!]: payload.value }
        : item
    );
  }
  // delete
  return list.filter((item) => item.id !== payload.itemId);
};

export function boardReducer(
  state: BoardState,
  action: BoardAction,
): BoardState {
  switch (action.type) {
    // ── COLUMNS ──────────────────────────────────────────────────────────────

    case "COLUMN/ADD":
      return { ...state, columns: [...state.columns, action.payload] };

    case "COLUMN/DELETE": {
      const { columnId } = action.payload;
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

    case "COLUMN/REORDER": {
      const { columnId, beforeColumnId } = action.payload;
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

    case "COLUMN/SET_INPUT":
      return { ...state, defaultColumnInput: action.payload.value };

    case "COLUMN/SET_DRAGGED_INDEX":
      return { ...state, draggedDefaultIndex: action.payload.index };

    case "COLUMN/RENAME_START":
      return {
        ...state,
        editingColumnId: action.payload.columnId,
        editingColumnRowId: action.payload.rowId,
        editingColumnName: action.payload.currentName,
      };

    case "COLUMN/RENAME_CHANGE":
      return { ...state, editingColumnName: action.payload.name };

    case "COLUMN/RENAME_SAVE": {
      const trimmed = state.editingColumnName.trim();
      if (!trimmed) return { ...state, editingColumnId: null };
      return {
        ...state,
        columns: state.columns.map((c) =>
          c.id === action.payload.columnId ? { ...c, title: trimmed } : c
        ),
        editingColumnId: null,
        editingColumnRowId: null,
      };
    }

    case "COLUMN/RENAME_CANCEL":
      return {
        ...state,
        editingColumnId: null,
        editingColumnRowId: null,
        editingColumnName: "",
      };

    // ── ROWS ──────────────────────────────────────────────────────────────────

    case "ROW/ADD":
      return { ...state, rows: [...state.rows, action.payload] };

    case "ROW/DELETE": {
      const { rowId } = action.payload;
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

    case "ROW/MOVE": {
      const { fromIndex, toIndex } = action.payload;
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

    case "ROW/UPDATE_COLOR":
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === action.payload.rowId
            ? { ...r, color: action.payload.color }
            : r
        ),
      };

    case "ROW/EDIT_START":
      return {
        ...state,
        editingRowId: action.payload.rowId,
        editingRowName: action.payload.currentName,
      };

    case "ROW/EDIT_CHANGE":
      return { ...state, editingRowName: action.payload.name };

    case "ROW/EDIT_SAVE": {
      const trimmed = state.editingRowName.trim();
      if (!trimmed) return { ...state, editingRowId: null };
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === action.payload.rowId ? { ...r, title: trimmed } : r
        ),
        editingRowId: null,
      };
    }

    case "ROW/EDIT_CANCEL":
      return { ...state, editingRowId: null, editingRowName: "" };

    case "ROW/RENAME": {
      const trimmed = action.payload.name.trim();
      if (!trimmed) return state;
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === action.payload.rowId ? { ...r, title: trimmed } : r
        ),
      };
    }

    case "ROW/SET_NEW_NAME":
      return { ...state, newRowName: action.payload.name };

    case "ROW/SET_NEW_PROMPT":
      return { ...state, newRowPrompt: action.payload.prompt };

    case "ROW/RESET_FORM":
      return {
        ...state,
        newRowName: "",
        newRowPrompt: "",
        newRowFormKey: state.newRowFormKey + 1,
      };

    // ── TASKS ─────────────────────────────────────────────────────────────────

    case "TASK/CREATE":
      return {
        ...state,
        tasks: [action.payload.task, ...state.tasks],
        taskCreateModalOpen: false,
        checklistModalTaskId: null,
        checklistPrompt: "",
        checklistPreview: [],
        checklistModalError: "",
      };

    case "TASK/DELETE": {
      const next: BoardState = {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload.taskId),
      };
      if (state.editingTaskId === action.payload.taskId) {
        return {
          ...next,
          editingTaskId: null,
          editTaskDraft: null,
          taskEditModalOpen: false,
        };
      }
      return next;
    }

    case "TASK/SAVE_EDIT": {
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

    case "TASK/MOVE_TO_COLUMN":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.taskId
            ? { ...t, colId: action.payload.colId }
            : t
        ),
      };

    case "TASK/TOGGLE_CHECKLIST_ITEM":
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.payload.taskId) return t;
          return {
            ...t,
            checklist: t.checklist.map((item) =>
              item.id === action.payload.itemId
                ? { ...item, checked: !item.checked }
                : item
            ),
          };
        }),
      };

    case "TASK/OPEN_CREATE_MODAL":
      return {
        ...state,
        taskCreateModalOpen: true,
        taskDraft: emptyTaskDraft(action.payload.rowId, action.payload.colId),
        checklistModalTaskId: null,
        checklistPrompt: "",
        checklistPreview: [],
        checklistModalError: "",
      };

    case "TASK/CLOSE_CREATE_MODAL":
      return {
        ...state,
        taskCreateModalOpen: false,
        checklistModalTaskId: null,
        checklistPrompt: "",
        checklistPreview: [],
        checklistModalError: "",
      };

    case "TASK/OPEN_EDIT_MODAL": {
      const { task } = action.payload;
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

    case "TASK/CLOSE_EDIT_MODAL":
      return {
        ...state,
        editingTaskId: null,
        editTaskDraft: null,
        taskEditModalOpen: false,
      };

    case "TASK/UPDATE_DRAFT":
      return { ...state, taskDraft: action.payload.draft };

    case "TASK/UPDATE_EDIT_DRAFT":
      return { ...state, editTaskDraft: action.payload.draft };

    // ── CHECKLIST ITEMS ───────────────────────────────────────────────────────

    case "CHECKLIST/ADD_ITEM": {
      const { target, item, insertBeforeIndex } = action.payload;
      if (target === "draft") {
        return {
          ...state,
          taskDraft: {
            ...state.taskDraft,
            checklist: mutateChecklist(state.taskDraft.checklist, "add", {
              item,
              insertBeforeIndex,
            }),
          },
        };
      }
      if (!state.editTaskDraft) return state;
      return {
        ...state,
        editTaskDraft: {
          ...state.editTaskDraft,
          checklist: mutateChecklist(state.editTaskDraft.checklist, "add", {
            item,
            insertBeforeIndex,
          }),
        },
      };
    }

    case "CHECKLIST/UPDATE_ITEM": {
      const { target, itemId, field, value } = action.payload;
      if (target === "draft") {
        return {
          ...state,
          taskDraft: {
            ...state.taskDraft,
            checklist: mutateChecklist(state.taskDraft.checklist, "update", {
              itemId,
              field,
              value,
            }),
          },
        };
      }
      if (!state.editTaskDraft) return state;
      return {
        ...state,
        editTaskDraft: {
          ...state.editTaskDraft,
          checklist: mutateChecklist(state.editTaskDraft.checklist, "update", {
            itemId,
            field,
            value,
          }),
        },
      };
    }

    case "CHECKLIST/DELETE_ITEM": {
      const { target, itemId } = action.payload;
      if (target === "draft") {
        return {
          ...state,
          taskDraft: {
            ...state.taskDraft,
            checklist: mutateChecklist(state.taskDraft.checklist, "delete", {
              itemId,
            }),
          },
        };
      }
      if (!state.editTaskDraft) return state;
      return {
        ...state,
        editTaskDraft: {
          ...state.editTaskDraft,
          checklist: mutateChecklist(state.editTaskDraft.checklist, "delete", {
            itemId,
          }),
        },
      };
    }

    // ── CHECKLIST AI ──────────────────────────────────────────────────────────

    case "CHECKLIST_AI/SET_PROMPT":
      return { ...state, checklistPrompt: action.payload.prompt };

    case "CHECKLIST_AI/GENERATE_START":
      return {
        ...state,
        isGeneratingChecklist: true,
        checklistModalError: "",
        checklistModalTaskId: action.payload.taskId,
      };

    case "CHECKLIST_AI/GENERATE_SUCCESS":
      return {
        ...state,
        isGeneratingChecklist: false,
        checklistPreview: action.payload.items,
        checklistModalError: action.payload.items.length === 0
          ? "No checklist items were generated."
          : "",
      };

    case "CHECKLIST_AI/GENERATE_FAILURE":
      return {
        ...state,
        isGeneratingChecklist: false,
        checklistModalError: action.payload.error,
      };

    case "CHECKLIST_AI/APPLY_TO_EDIT_DRAFT": {
      if (!state.checklistModalTaskId || state.checklistPreview.length === 0) {
        return state;
      }
      if (
        !state.editTaskDraft ||
        state.editTaskDraft.id !== state.checklistModalTaskId
      ) {
        return state;
      }
      return {
        ...state,
        editTaskDraft: {
          ...state.editTaskDraft,
          checklist: [
            ...state.editTaskDraft.checklist,
            ...state.checklistPreview.map((text) => ({
              id: createId(),
              text,
              checked: false,
            })),
          ],
        },
        checklistModalTaskId: null,
        checklistPrompt: "",
        checklistPreview: [],
        checklistModalError: "",
      };
    }

    case "CHECKLIST_AI/APPLY_TO_CREATE_DRAFT": {
      if (state.checklistPreview.length === 0) return state;
      return {
        ...state,
        taskDraft: {
          ...state.taskDraft,
          checklist: [
            ...state.taskDraft.checklist,
            ...state.checklistPreview.map((text) => ({
              id: createId(),
              text,
              checked: false,
            })),
          ],
        },
        checklistPreview: [],
      };
    }

    case "CHECKLIST_AI/RESET":
      return {
        ...state,
        checklistModalTaskId: null,
        checklistPrompt: "",
        checklistPreview: [],
        checklistModalError: "",
      };

    // ── TASK AI ───────────────────────────────────────────────────────────────

    case "TASK_AI/GENERATE_START":
      return {
        ...state,
        isGeneratingTasks: true,
        taskGenerationStatus: "Generating tasks...",
      };

    case "TASK_AI/GENERATE_SUCCESS": {
      const count = action.payload.tasks.length;
      return {
        ...state,
        isGeneratingTasks: false,
        tasks: [...action.payload.tasks, ...state.tasks],
        taskGenerationStatus: `Added ${count} task${
          count !== 1 ? "s" : ""
        } to Todo`,
        newRowName: "",
        newRowPrompt: "",
        newRowFormKey: state.newRowFormKey + 1,
      };
    }

    case "TASK_AI/GENERATE_FAILURE":
      return {
        ...state,
        isGeneratingTasks: false,
        taskGenerationStatus: action.payload.error,
        newRowName: "",
        newRowPrompt: "",
        newRowFormKey: state.newRowFormKey + 1,
      };

    // ── DRAG ──────────────────────────────────────────────────────────────────

    case "DRAG/START_TASK":
      return { ...state, draggedTask: action.payload };

    case "DRAG/END_TASK":
      return { ...state, draggedTask: null };

    case "DRAG/DROP_TASK": {
      const { toRowId, toColId } = action.payload;
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
          t.id === state.draggedTask!.taskId
            ? { ...t, colId: toColId, order: newOrder }
            : t
        ),
        draggedTask: null,
      };
    }

    case "DRAG/SET_DEFAULT_INDEX":
      return { ...state, draggedDefaultIndex: action.payload.index };

    case "TASK/REORDER_IN_CELL": {
      const { taskId, beforeTaskId } = action.payload;
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

    // ── BOARD ─────────────────────────────────────────────────────────────────

    case "BOARD/LOAD": {
      const { rows, columns, tasks } = action.payload;
      return {
        ...state,
        rows: [...rows].sort((a, b) => a.order < b.order ? -1 : 1),
        columns: [...columns].sort((a, b) => a.order < b.order ? -1 : 1),
        tasks,
        boardLoaded: true,
      };
    }

    case "BOARD/RESET": {
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

    default:
      return state;
  }
}
