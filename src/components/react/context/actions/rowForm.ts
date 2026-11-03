import { useCallback, useMemo } from "react";
import {
  useBoardDataState,
  useBoardDispatch,
  useRowFormState,
} from "../BoardContext.tsx";
import { createId, rowColorOptions } from "../constants.ts";
import { buildTasksFromTitles, fetchGeneratedItems } from "./shared.ts";
import { generateKeyBetween } from "fractional-indexing";
import type { SubmitEvent } from "react";
import type { RowAction } from "../types.ts";

type NewRow = Extract<RowAction, { type: "ROW/ADD" }>["payload"];

// How long the completed status stays visible before the modal closes.
const CLOSE_AFTER_GENERATE_MS = 1000;

const scrollToRow = (rowId: string) => {
  requestAnimationFrame(() => {
    document.getElementById(`row-section-${rowId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
};

export function useRowFormActions() {
  const dispatch = useBoardDispatch();
  const { newRowName, newRowPrompt } = useRowFormState();
  const { rows, columns } = useBoardDataState();

  // The row is only created once tasks come back; on failure no row is added
  // and the modal stays open showing the error.
  const generateTasksForRow = useCallback(async (newRow: NewRow) => {
    const prompt = newRowPrompt.trim();
    if (!prompt) return;

    dispatch({ type: "TASK_AI/GENERATE_START" });

    try {
      const titles = await fetchGeneratedItems(prompt, 10);
      const tasks = buildTasksFromTitles(titles, newRow.id, columns);

      if (tasks.length > 0) {
        dispatch({ type: "ROW/ADD", payload: newRow });
        dispatch({ type: "TASK_AI/GENERATE_SUCCESS", payload: { tasks } });
        await new Promise((resolve) =>
          setTimeout(resolve, CLOSE_AFTER_GENERATE_MS)
        );
        dispatch({ type: "ROW/CLOSE_CREATE_MODAL" });
        scrollToRow(newRow.id);
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

  const addRow = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!newRowName.trim()) return;
      const lastRow = rows[rows.length - 1];
      const newRow: NewRow = {
        id: createId(),
        title: newRowName.trim(),
        color: rowColorOptions[0].value,
        order: generateKeyBetween(lastRow?.order ?? null, null),
      };
      if (newRowPrompt.trim()) {
        await generateTasksForRow(newRow);
        return;
      }
      dispatch({ type: "ROW/ADD", payload: newRow });
      dispatch({ type: "ROW/CLOSE_CREATE_MODAL" });
      scrollToRow(newRow.id);
      dispatch({ type: "ROW/RESET_FORM" });
    },
    [newRowName, newRowPrompt, rows, dispatch, generateTasksForRow],
  );

  const setters = useMemo(() => ({
    setNewRowName: (name: string) =>
      dispatch({ type: "ROW/SET_NEW_NAME", payload: { name } }),
    setNewRowPrompt: (prompt: string) =>
      dispatch({ type: "ROW/SET_NEW_PROMPT", payload: { prompt } }),
    openCreateRowModal: () => dispatch({ type: "ROW/OPEN_CREATE_MODAL" }),
    closeCreateRowModal: () => dispatch({ type: "ROW/CLOSE_CREATE_MODAL" }),
  }), [dispatch]);

  return { ...setters, addRow, generateTasksForRow };
}
