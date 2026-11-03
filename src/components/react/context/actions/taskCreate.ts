import { useCallback, useMemo } from "react";
import {
  useBoardDataState,
  useBoardDispatch,
  useBoardRefs,
  useTaskCreateState,
  useTasksByCell,
} from "../BoardContext.tsx";
import { createId } from "../constants.ts";
import { generateKeyBetween } from "fractional-indexing";
import { liveRowId, validateEntity } from "./shared.ts";
import type { FieldError } from "./shared.ts";
import type { Task } from "../types.ts";

export function useTaskCreateActions() {
  const dispatch = useBoardDispatch();
  const { focusChecklistInput } = useBoardRefs();
  const { taskDraft } = useTaskCreateState();
  const { rows } = useBoardDataState();
  const tasksByCell = useTasksByCell();

  // Resolves to the validation error to show (the modal stays open), or null
  // once created.
  const createTask = useCallback(async (
    event: Event,
    description?: string,
  ): Promise<FieldError | null> => {
    event.preventDefault();
    const checked = await validateEntity("task", {
      title: taskDraft.title,
      description: description ?? taskDraft.description,
      rowId: liveRowId(rows, taskDraft.rowId),
      colId: taskDraft.colId,
      checklist: taskDraft.checklist,
    });
    if (!checked.ok) return checked;
    const { rowId, colId } = checked.values;
    const cellTasks = tasksByCell[`${rowId}|${colId}`] ?? [];
    const firstOrder = cellTasks[0]?.order ?? null;
    const task: Task = {
      ...checked.values,
      id: createId(),
      order: generateKeyBetween(null, firstOrder),
      trashedAt: null,
      preTrashColId: null,
    };
    dispatch({ type: "TASK/CREATE", payload: { task } });
    return null;
  }, [taskDraft, rows, tasksByCell, dispatch]);

  const addChecklistItem = useCallback((
    focusNew = false,
    insertBeforeIndex?: number,
    text = "",
  ) => {
    // order is assigned by the reducer from the insert position's neighbors.
    const item = { id: createId(), text, checked: false, order: "" };
    dispatch({
      type: "CHECKLIST/ADD_ITEM",
      payload: { target: "draft", item, insertBeforeIndex },
    });
    if (focusNew) setTimeout(() => focusChecklistInput(item.id), 0);
  }, [dispatch, focusChecklistInput]);

  const dispatchOnly = useMemo(() => ({
    setTaskDraft: (draft: Task) =>
      dispatch({ type: "TASK/UPDATE_DRAFT", payload: { draft } }),
    updateChecklistItem: (id: string, field: string, value: string | boolean) =>
      dispatch({
        type: "CHECKLIST/UPDATE_ITEM",
        payload: {
          target: "draft",
          itemId: id,
          field: field as "text" | "checked",
          value,
        },
      }),
    deleteChecklistItem: (id: string) =>
      dispatch({
        type: "CHECKLIST/DELETE_ITEM",
        payload: { target: "draft", itemId: id },
      }),
    reorderChecklistItem: (itemId: string, beforeItemId: string | null) =>
      dispatch({
        type: "CHECKLIST/REORDER_ITEM",
        payload: { target: "draft", itemId, beforeItemId },
      }),
  }), [dispatch]);

  return { ...dispatchOnly, createTask, addChecklistItem };
}
