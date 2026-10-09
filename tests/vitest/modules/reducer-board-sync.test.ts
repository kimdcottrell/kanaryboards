import { describe, expect, test } from "vitest";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import type {
  BoardState,
  Column,
  Row,
  Task,
} from "@components/context/types.ts";

const row = (id: string): Row => ({
  id,
  title: id,
  color: "#fff",
  order: "a0",
});

const column: Column = {
  id: "col-1",
  title: "To Do",
  order: "a0",
  pinnedToShortcut: false,
  pinnedToDock: false,
  icon: null,
  iconInBoardMenu: false,
  iconNearColumnTitle: false,
  isTrash: false,
};

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  rowId: "row-1",
  colId: "col-1",
  title: "Task",
  description: "",
  checklist: [],
  order: "a0",
  trashedAt: null,
  preTrashColId: null,
  ...overrides,
});

const base = (): BoardState => ({
  ...createInitialState(),
  rows: [row("row-1"), row("row-2")],
  columns: [column],
  tasks: [task()],
  boardLoaded: true,
});

const sync = (state: BoardState, rows: Row[], tasks: Task[] = []) =>
  boardReducer(state, {
    type: "BOARD/SYNC",
    payload: { rows, columns: [column], tasks },
  });

describe("BOARD/SYNC", () => {
  test("replaces rows, columns and tasks", () => {
    const next = sync(base(), [row("row-2")], []);
    expect(next.rows.map((r) => r.id)).toEqual(["row-2"]);
    expect(next.tasks).toEqual([]);
  });

  test("closes every task modal when no rows are left", () => {
    let state = boardReducer(base(), {
      type: "TASK/OPEN_CREATE_MODAL",
      payload: { rowId: "", colId: "" },
    });
    state = boardReducer(state, {
      type: "TASK/OPEN_EDIT_MODAL",
      payload: { task: task() },
    });
    state = { ...state, checklistModalTaskId: "task-1", checklistPrompt: "x" };

    const next = sync(state, []);
    expect(next.taskCreateModalOpen).toBe(false);
    expect(next.taskEditModalOpen).toBe(false);
    expect(next.editingTaskId).toBeNull();
    expect(next.editTaskDraft).toBeNull();
    expect(next.checklistModalTaskId).toBeNull();
    expect(next.checklistPrompt).toBe("");
  });

  test("keeps modals open but clears the project when the draft's row is gone", () => {
    let state = boardReducer(base(), {
      type: "TASK/OPEN_CREATE_MODAL",
      payload: { rowId: "row-1", colId: "col-1" },
    });
    state = boardReducer(state, {
      type: "TASK/OPEN_EDIT_MODAL",
      payload: { task: task() },
    });
    state = boardReducer(state, {
      type: "TASK/UPDATE_EDIT_DRAFT",
      payload: { draft: { ...state.editTaskDraft!, title: "Unsaved" } },
    });

    const next = sync(state, [row("row-2")]);
    expect(next.taskCreateModalOpen).toBe(true);
    expect(next.taskDraft.rowId).toBe("");
    expect(next.taskEditModalOpen).toBe(true);
    expect(next.editTaskDraft?.rowId).toBe("");
    expect(next.editTaskDraft?.title).toBe("Unsaved");
  });

  test("leaves drafts alone when their row still exists", () => {
    const state = boardReducer(base(), {
      type: "TASK/OPEN_CREATE_MODAL",
      payload: { rowId: "row-2", colId: "col-1" },
    });
    const next = sync(state, [row("row-2")]);
    expect(next.taskDraft).toBe(state.taskDraft);
  });
});

describe("TASK/SAVE_EDIT", () => {
  test("adds the task back when another tab deleted it", () => {
    let state = boardReducer(base(), {
      type: "TASK/OPEN_EDIT_MODAL",
      payload: { task: task() },
    });
    state = sync(state, [row("row-2")], [
      task({ id: "other", rowId: "row-2" }),
    ]);
    state = boardReducer(state, {
      type: "TASK/UPDATE_EDIT_DRAFT",
      payload: {
        draft: { ...state.editTaskDraft!, title: " Kept ", rowId: "row-2" },
      },
    });

    const next = boardReducer(state, { type: "TASK/SAVE_EDIT" });
    const restored = next.tasks.find((t) => t.id === "task-1");
    expect(restored).toMatchObject({ title: "Kept", rowId: "row-2" });
    expect(restored!.order > "a0").toBe(true);
    expect(next.taskEditModalOpen).toBe(false);
  });
});
