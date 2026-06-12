import { useCallback, useMemo } from "react";
import { useBoardDispatch, useChecklistAIState } from "../BoardContext.tsx";
import { fetchGeneratedItems } from "./shared.ts";
import type { Task } from "../types.ts";

export function useChecklistAIActions() {
  const dispatch = useBoardDispatch();
  const { checklistPrompt } = useChecklistAIState();

  const generateChecklistItems = useCallback(async (task?: Task) => {
    const taskTitle = task?.title ?? "Break down this task...";
    const taskId = task?.id ?? null;
    const prompt = checklistPrompt.trim() || taskTitle;
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
  }, [checklistPrompt, dispatch]);

  const dispatchOnly = useMemo(() => ({
    setChecklistPrompt: (prompt: string) =>
      dispatch({ type: "CHECKLIST_AI/SET_PROMPT", payload: { prompt } }),
    applyChecklistPreview: () =>
      dispatch({ type: "CHECKLIST_AI/APPLY_TO_EDIT_DRAFT" }),
    applyChecklistPreviewToDraft: () =>
      dispatch({ type: "CHECKLIST_AI/APPLY_TO_CREATE_DRAFT" }),
    clearChecklistPreview: () => dispatch({ type: "CHECKLIST_AI/RESET" }),
  }), [dispatch]);

  return { ...dispatchOnly, generateChecklistItems };
}
