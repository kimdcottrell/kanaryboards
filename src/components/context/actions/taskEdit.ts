import { useCallback, useMemo } from "react";
import {
  useBoardDispatch,
  useBoardRefs,
  useTaskEditState,
} from "../BoardContext.tsx";
import { createId } from "../constants.ts";
import type { Task } from "../types.ts";

export function useTaskEditActions() {
  const dispatch = useBoardDispatch();
  const { focusChecklistInput } = useBoardRefs();
  const { editTaskDraft } = useTaskEditState();

  const saveTaskEdit = useCallback((
    event: Event,
    content?: { json: string; markdown: string; html: string },
  ) => {
    event.preventDefault();
    if (!(event.target as HTMLFormElement).checkValidity()) return;
    if (content !== undefined && editTaskDraft) {
      dispatch({
        type: "TASK/UPDATE_EDIT_DRAFT",
        payload: {
          draft: { ...editTaskDraft, description: content.json },
        },
      });
    }
    dispatch({ type: "TASK/SAVE_EDIT" });
  }, [editTaskDraft, dispatch]);

  const addEditChecklistItem = useCallback((
    focusNew = false,
    insertBeforeIndex?: number,
  ) => {
    const item = { id: createId(), text: "", checked: false };
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
  }), [dispatch]);

  return { ...dispatchOnly, saveTaskEdit, addEditChecklistItem };
}
