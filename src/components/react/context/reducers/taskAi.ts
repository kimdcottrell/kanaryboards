import type { BoardState, TaskAIAction } from "../types.ts";

export function generateStart(state: BoardState): BoardState {
  return {
    ...state,
    isGeneratingTasks: true,
    taskGenerationFailed: false,
    taskGenerationStatus: "Generating tasks...",
  };
}

export function generateSuccess(
  state: BoardState,
  payload: Extract<
    TaskAIAction,
    { type: "TASK_AI/GENERATE_SUCCESS" }
  >["payload"],
): BoardState {
  const count = payload.tasks.length;
  return {
    ...state,
    isGeneratingTasks: false,
    taskGenerationFailed: false,
    tasks: [...payload.tasks, ...state.tasks],
    taskGenerationStatus: `Added ${count} task${
      count !== 1 ? "s" : ""
    } to first column.`,
    newRowName: "",
    newRowPrompt: "",
    newRowFormKey: state.newRowFormKey + 1,
  };
}

// Row is not created on failure, so keep name/prompt for a retry.
export function generateFailure(
  state: BoardState,
  payload: Extract<
    TaskAIAction,
    { type: "TASK_AI/GENERATE_FAILURE" }
  >["payload"],
): BoardState {
  return {
    ...state,
    isGeneratingTasks: false,
    taskGenerationFailed: true,
    taskGenerationStatus: payload.error,
  };
}
