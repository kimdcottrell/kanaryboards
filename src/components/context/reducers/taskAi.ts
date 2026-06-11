import type { BoardState, TaskAIAction } from "../types.ts";

export function generateStart(state: BoardState): BoardState {
  return {
    ...state,
    isGeneratingTasks: true,
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
    tasks: [...payload.tasks, ...state.tasks],
    taskGenerationStatus: `Added ${count} task${
      count !== 1 ? "s" : ""
    } to Todo`,
    newRowName: "",
    newRowPrompt: "",
    newRowFormKey: state.newRowFormKey + 1,
  };
}

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
    taskGenerationStatus: payload.error,
    newRowName: "",
    newRowPrompt: "",
    newRowFormKey: state.newRowFormKey + 1,
  };
}
