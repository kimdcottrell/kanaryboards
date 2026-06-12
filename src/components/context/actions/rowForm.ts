import { useCallback, useMemo } from "react";
import {
  useBoardDataState,
  useBoardDispatch,
  useRowFormState,
} from "../BoardContext.tsx";
import { createId, rowColorOptions } from "../constants.ts";
import { findTodoColumnId } from "../selectors.ts";
import { fetchGeneratedItems } from "./shared.ts";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { Task } from "../types.ts";

export function useRowFormActions() {
  const dispatch = useBoardDispatch();
  const { newRowName, newRowPrompt } = useRowFormState();
  const { rows, columns } = useBoardDataState();

  const generateTasksForRow = useCallback(async (rowId: string) => {
    const prompt = newRowPrompt.trim();
    if (!prompt) return;

    dispatch({ type: "TASK_AI/GENERATE_START" });

    try {
      const titles = await fetchGeneratedItems(prompt, 10);
      const todoColId = findTodoColumnId(columns);
      const orders = generateNKeysBetween(null, null, titles.length);
      const tasks: Task[] = titles.map((title, i) => ({
        id: createId(),
        rowId,
        colId: todoColId,
        order: orders[i],
        title,
        description: "",
        checklist: [],
      }));

      if (tasks.length > 0) {
        dispatch({ type: "TASK_AI/GENERATE_SUCCESS", payload: { tasks } });
      } else {
        dispatch({
          type: "TASK_AI/GENERATE_FAILURE",
          payload: { error: "No tasks were generated." },
        });
      }
    } catch (error) {
      console.error(error);
      dispatch({
        type: "TASK_AI/GENERATE_FAILURE",
        payload: {
          error: `Unable to generate tasks. ${error}`,
        },
      });
    }
  }, [newRowPrompt, columns, dispatch]);

  const addRow = useCallback(async (event: Event) => {
    event.preventDefault();
    if (!newRowName.trim()) return;
    const newRowId = createId();
    const lastRow = rows[rows.length - 1];
    dispatch({
      type: "ROW/ADD",
      payload: {
        id: newRowId,
        title: newRowName.trim(),
        color: rowColorOptions[0].value,
        order: generateKeyBetween(lastRow?.order ?? null, null),
      },
    });
    if (newRowPrompt.trim()) {
      await generateTasksForRow(newRowId);
    } else {
      dispatch({ type: "ROW/RESET_FORM" });
    }
  }, [newRowName, newRowPrompt, rows, dispatch, generateTasksForRow]);

  const setters = useMemo(() => ({
    setNewRowName: (name: string) =>
      dispatch({ type: "ROW/SET_NEW_NAME", payload: { name } }),
    setNewRowPrompt: (prompt: string) =>
      dispatch({ type: "ROW/SET_NEW_PROMPT", payload: { prompt } }),
  }), [dispatch]);

  return { ...setters, addRow, generateTasksForRow };
}
