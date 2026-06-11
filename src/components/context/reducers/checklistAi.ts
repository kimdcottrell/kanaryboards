import type { BoardState, ChecklistAIAction } from "../types.ts";
import { createId } from "../constants.ts";

export function setPrompt(
  state: BoardState,
  payload: Extract<
    ChecklistAIAction,
    { type: "CHECKLIST_AI/SET_PROMPT" }
  >["payload"],
): BoardState {
  return { ...state, checklistPrompt: payload.prompt };
}

export function generateStart(
  state: BoardState,
  payload: Extract<
    ChecklistAIAction,
    { type: "CHECKLIST_AI/GENERATE_START" }
  >["payload"],
): BoardState {
  return {
    ...state,
    isGeneratingChecklist: true,
    checklistModalError: "",
    checklistModalTaskId: payload.taskId,
  };
}

export function generateSuccess(
  state: BoardState,
  payload: Extract<
    ChecklistAIAction,
    { type: "CHECKLIST_AI/GENERATE_SUCCESS" }
  >["payload"],
): BoardState {
  return {
    ...state,
    isGeneratingChecklist: false,
    checklistPreview: payload.items,
    checklistModalError: payload.items.length === 0
      ? "No checklist items were generated."
      : "",
  };
}

export function generateFailure(
  state: BoardState,
  payload: Extract<
    ChecklistAIAction,
    { type: "CHECKLIST_AI/GENERATE_FAILURE" }
  >["payload"],
): BoardState {
  return {
    ...state,
    isGeneratingChecklist: false,
    checklistModalError: payload.error,
  };
}

export function applyToEditDraft(state: BoardState): BoardState {
  if (!state.checklistModalTaskId || state.checklistPreview.length === 0) {
    return state;
  }
  if (
    !state.editTaskDraft ||
    state.editTaskDraft.id !== state.checklistModalTaskId
  ) {
    return state;
  }
  return {
    ...state,
    editTaskDraft: {
      ...state.editTaskDraft,
      checklist: [
        ...state.editTaskDraft.checklist,
        ...state.checklistPreview.map((text) => ({
          id: createId(),
          text,
          checked: false,
        })),
      ],
    },
    checklistModalTaskId: null,
    checklistPrompt: "",
    checklistPreview: [],
    checklistModalError: "",
  };
}

export function applyToCreateDraft(state: BoardState): BoardState {
  if (state.checklistPreview.length === 0) return state;
  return {
    ...state,
    taskDraft: {
      ...state.taskDraft,
      checklist: [
        ...state.taskDraft.checklist,
        ...state.checklistPreview.map((text) => ({
          id: createId(),
          text,
          checked: false,
        })),
      ],
    },
    checklistPreview: [],
  };
}

export function reset(state: BoardState): BoardState {
  return {
    ...state,
    checklistModalTaskId: null,
    checklistPrompt: "",
    checklistPreview: [],
    checklistModalError: "",
  };
}
