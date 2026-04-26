import type { Dispatch } from "react";
import type { BoardAction, BoardState, Task } from "./types.ts";
import { createId, rowColorOptions, STORAGE_KEY } from "./constants.ts";
import { findTodoColumnId } from "./selectors.ts";

const fetchGeneratedItems = async (
  prompt: string,
  maxItems = 10,
): Promise<string[]> => {
  const response = await fetch("/api/generate-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTasks: maxItems }),
  });
  if (!response.ok) throw new Error("AI generation failed");
  const data = await response.json();
  return Array.isArray(data.response)
    ? data.response.map((item: unknown) => String(item).trim())
    : [];
};

export function useAsyncActions(
  state: BoardState,
  dispatch: Dispatch<BoardAction>,
  focusChecklistInput: (id: string) => void,
) {
  const generateTasksForRow = async (rowId: string) => {
    const prompt = state.newRowPrompt.trim();
    if (!prompt) return;

    dispatch({ type: "TASK_AI/GENERATE_START" });

    try {
      const titles = await fetchGeneratedItems(prompt, 10);
      const todoColId = findTodoColumnId(state.columns);
      const tasks: Task[] = titles.map((title) => ({
        id: createId(),
        rowId,
        colId: todoColId,
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
  };

  const generateChecklistItems = async (task?: Task) => {
    const taskTitle = task?.title ?? "Break down this task...";
    const taskId = task?.id ?? null;
    const prompt = state.checklistPrompt.trim() || taskTitle;
    if (!prompt) return;

    dispatch({ type: "CHECKLIST_AI/GENERATE_START", payload: { taskId } });

    try {
      const items = await fetchGeneratedItems(prompt, 10);
      dispatch({ type: "CHECKLIST_AI/GENERATE_SUCCESS", payload: { items } });
    } catch (error) {
      console.error(error);
      dispatch({
        type: "CHECKLIST_AI/GENERATE_FAILURE",
        payload: {
          error: `Unable to generate checklist items. ${error}`,
        },
      });
    }
  };

  const addRow = async (event: Event) => {
    event.preventDefault();
    if (!state.newRowName.trim()) return;
    const newRowId = createId();
    dispatch({
      type: "ROW/ADD",
      payload: {
        id: newRowId,
        name: state.newRowName.trim(),
        color: rowColorOptions[0].value,
      },
    });
    if (state.newRowPrompt.trim()) {
      await generateTasksForRow(newRowId);
    } else {
      dispatch({ type: "ROW/RESET_FORM" });
    }
  };

  const confirmResetBoard = () => {
    if (typeof globalThis.confirm === "undefined") return;
    const confirmed = globalThis.confirm(
      "Reset the board?\n\nThis will set ALL rows, columns, and tasks back to defaults.\n\nIt cannot be undone.",
    );
    if (confirmed) {
      dispatch({ type: "BOARD/RESET" });
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    }
  };

  const addChecklistItem = (
    focusNew = false,
    insertBeforeIndex?: number,
  ) => {
    const item = { id: createId(), text: "", checked: false };
    dispatch({
      type: "CHECKLIST/ADD_ITEM",
      payload: { target: "draft", item, insertBeforeIndex },
    });
    if (focusNew) setTimeout(() => focusChecklistInput(item.id), 0);
  };

  const addEditChecklistItem = (
    focusNew = false,
    insertBeforeIndex?: number,
  ) => {
    const item = { id: createId(), text: "", checked: false };
    dispatch({
      type: "CHECKLIST/ADD_ITEM",
      payload: { target: "editDraft", item, insertBeforeIndex },
    });
    if (focusNew) setTimeout(() => focusChecklistInput(item.id), 0);
  };

  return {
    generateTasksForRow,
    generateChecklistItems,
    addRow,
    confirmResetBoard,
    addChecklistItem,
    addEditChecklistItem,
  };
}
