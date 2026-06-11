import type { BoardState, ChecklistAction, ChecklistItem } from "../types.ts";

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

export function addItem(
  state: BoardState,
  payload: Extract<ChecklistAction, { type: "CHECKLIST/ADD_ITEM" }>["payload"],
): BoardState {
  const { target, item, insertBeforeIndex } = payload;
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

export function updateItem(
  state: BoardState,
  payload: Extract<
    ChecklistAction,
    { type: "CHECKLIST/UPDATE_ITEM" }
  >["payload"],
): BoardState {
  const { target, itemId, field, value } = payload;
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

export function removeItem(
  state: BoardState,
  payload: Extract<
    ChecklistAction,
    { type: "CHECKLIST/DELETE_ITEM" }
  >["payload"],
): BoardState {
  const { target, itemId } = payload;
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
