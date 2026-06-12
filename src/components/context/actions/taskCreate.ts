import { useCallback, useMemo } from "react";
import {
  useBoardDispatch,
  useBoardRefs,
  useTaskCreateState,
  useTasksByCell,
} from "../BoardContext.tsx";
import { createId } from "../constants.ts";
import { generateKeyBetween } from "fractional-indexing";
import type { ChecklistItem, Task } from "../types.ts";

export function useTaskCreateActions() {
  const dispatch = useBoardDispatch();
  const { focusChecklistInput } = useBoardRefs();
  const { taskDraft } = useTaskCreateState();
  const tasksByCell = useTasksByCell();

  const createTask = useCallback((
    event: Event,
    content?: { json: string; markdown: string; html: string },
  ) => {
    event.preventDefault();
    if (!(event.target as HTMLFormElement).checkValidity()) return;
    const { rowId, colId } = taskDraft;
    const cellKey = `${rowId}|${colId}`;
    const cellTasks = tasksByCell[cellKey] ?? [];
    const firstOrder = cellTasks[0]?.order ?? null;
    const task: Task = {
      id: createId(),
      rowId,
      colId,
      order: generateKeyBetween(null, firstOrder),
      title: taskDraft.title.trim(),
      description: content?.json ?? taskDraft.description,
      checklist: taskDraft.checklist.filter(
        (item: ChecklistItem) => item.text.trim(),
      ),
    };
    dispatch({ type: "TASK/CREATE", payload: { task } });
  }, [taskDraft, tasksByCell, dispatch]);

  const addChecklistItem = useCallback((
    focusNew = false,
    insertBeforeIndex?: number,
  ) => {
    const item = { id: createId(), text: "", checked: false };
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
  }), [dispatch]);

  return { ...dispatchOnly, createTask, addChecklistItem };
}
