import { describe, expect, test } from "vitest";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import type { BoardState } from "@components/context/types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function filledForm(): BoardState {
  return {
    ...createInitialState(),
    newRowName: "Pizza Making",
    newRowPrompt: "Steps to make a pizza",
    createRowModalOpen: true,
  };
}

// ── TASK_AI generation status ────────────────────────────────────────────────

describe("TASK_AI generation for a new row", () => {
  test("GENERATE_FAILURE flags the failure and keeps name/prompt for a retry", () => {
    const state = boardReducer(filledForm(), {
      type: "TASK_AI/GENERATE_START",
    });
    const next = boardReducer(state, {
      type: "TASK_AI/GENERATE_FAILURE",
      payload: { error: "Unable to generate tasks." },
    });
    expect(next.isGeneratingTasks).toBe(false);
    expect(next.taskGenerationFailed).toBe(true);
    expect(next.taskGenerationStatus).toBe("Unable to generate tasks.");
    expect(next.newRowName).toBe("Pizza Making");
    expect(next.newRowPrompt).toBe("Steps to make a pizza");
    expect(next.newRowFormKey).toBe(state.newRowFormKey);
    expect(next.createRowModalOpen).toBe(true);
  });

  test("GENERATE_START clears a previous failure", () => {
    const failed = { ...filledForm(), taskGenerationFailed: true };
    const next = boardReducer(failed, { type: "TASK_AI/GENERATE_START" });
    expect(next.taskGenerationFailed).toBe(false);
    expect(next.taskGenerationStatus).toBe("Generating tasks...");
  });

  test("GENERATE_SUCCESS clears the failure flag and keeps the modal open", () => {
    const failed = { ...filledForm(), taskGenerationFailed: true };
    const next = boardReducer(failed, {
      type: "TASK_AI/GENERATE_SUCCESS",
      payload: { tasks: [] },
    });
    expect(next.taskGenerationFailed).toBe(false);
    expect(next.createRowModalOpen).toBe(true);
  });
});

// ── ROW/CLOSE_CREATE_MODAL ───────────────────────────────────────────────────

describe("ROW/CLOSE_CREATE_MODAL", () => {
  test("clears the generation status and failure flag", () => {
    const state = {
      ...filledForm(),
      taskGenerationStatus: "Unable to generate tasks.",
      taskGenerationFailed: true,
    };
    const next = boardReducer(state, { type: "ROW/CLOSE_CREATE_MODAL" });
    expect(next.createRowModalOpen).toBe(false);
    expect(next.taskGenerationStatus).toBe("");
    expect(next.taskGenerationFailed).toBe(false);
  });
});
