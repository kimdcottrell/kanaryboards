import { useCallback, useMemo } from "react";
import {
  useBoardDataState,
  useBoardDispatch,
  useBoardRefs,
  useTaskEditState,
} from "../BoardContext.tsx";
import { createId } from "../constants.ts";
import type { Task } from "../types.ts";
import { clearEditDraft } from "../../task/editDraftStore.ts";
import { liveRowId, validateEntity } from "./shared.ts";
import type { FieldError } from "./shared.ts";

export function useTaskEditActions() {
  const dispatch = useBoardDispatch();
  const { focusChecklistInput } = useBoardRefs();
  const { editTaskDraft } = useTaskEditState();
  const { rows } = useBoardDataState();

  // Resolves to the validation error to show (the modal stays open), or null
  // once saved.
  const saveTaskEdit = useCallback(async (
    event: Event,
    description?: string,
  ): Promise<FieldError | null> => {
    event.preventDefault();
    if (!editTaskDraft) return null;
    const checked = await validateEntity("task", {
      title: editTaskDraft.title,
      description: description ?? editTaskDraft.description,
      rowId: liveRowId(rows, editTaskDraft.rowId),
      colId: editTaskDraft.colId,
      checklist: editTaskDraft.checklist,
    });
    if (!checked.ok) return checked;
    dispatch({ type: "TASK/SAVE_EDIT", payload: { edits: checked.values } });
    clearEditDraft(editTaskDraft.id);
    return null;
  }, [editTaskDraft, rows, dispatch]);

  const addEditChecklistItem = useCallback((
    focusNew = false,
    insertBeforeIndex?: number,
    text = "",
  ) => {
    // order is assigned by the reducer from the insert position's neighbors.
    const item = { id: createId(), text, checked: false, order: "" };
    dispatch({
      type: "CHECKLIST/ADD_ITEM",
      payload: { target: "editDraft", item, insertBeforeIndex },
    });
    if (focusNew) setTimeout(() => focusChecklistInput(item.id), 0);
  }, [dispatch, focusChecklistInput]);

  const dispatchOnly = useMemo(() => ({
    setEditTaskDraft: (draft: Task | null) => {
      if (draft) {
        dispatch({ type: "TASK/UPDATE_EDIT_DRAFT", payload: { draft } });
      } else dispatch({ type: "TASK/CLOSE_EDIT_MODAL" });
    },
    updateEditChecklistItem: (
      id: string,
      field: string,
      value: string | boolean,
    ) =>
      dispatch({
        type: "CHECKLIST/UPDATE_ITEM",
        payload: {
          target: "editDraft",
          itemId: id,
          field: field as "text" | "checked",
          value,
        },
      }),
    deleteEditChecklistItem: (id: string) =>
      dispatch({
        type: "CHECKLIST/DELETE_ITEM",
        payload: { target: "editDraft", itemId: id },
      }),
    reorderEditChecklistItem: (itemId: string, beforeItemId: string | null) =>
      dispatch({
        type: "CHECKLIST/REORDER_ITEM",
        payload: { target: "editDraft", itemId, beforeItemId },
      }),
  }), [dispatch]);

  return { ...dispatchOnly, saveTaskEdit, addEditChecklistItem };
}
