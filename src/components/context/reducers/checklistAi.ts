import type { BoardState, ChecklistAIAction, ChecklistItem } from "../types.ts";
import { createId } from "../constants.ts";
import { generateNKeysBetween } from "fractional-indexing";

// Build checklist items for AI-generated text, appending fractional orders
// after the last existing item so the array stays sorted by order.
function appendItems(
  existing: ChecklistItem[],
  texts: string[],
): ChecklistItem[] {
  const lastOrder = existing[existing.length - 1]?.order ?? null;
  const orders = generateNKeysBetween(lastOrder, null, texts.length);
  return [
    ...existing,
    ...texts.map((text, i) => ({
      id: createId(),
      text,
      checked: false,
      order: orders[i],
    })),
  ];
}

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
      checklist: appendItems(
        state.editTaskDraft.checklist,
        state.checklistPreview,
      ),
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
      checklist: appendItems(state.taskDraft.checklist, state.checklistPreview),
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
