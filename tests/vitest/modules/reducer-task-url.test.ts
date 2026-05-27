import { describe, test, expect } from "vitest";
import { boardReducer, createInitialState } from "@components/context/reducer.ts";
import type { BoardState, Task } from "@components/context/types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function stateWithTask(task: Task): BoardState {
  return {
    ...createInitialState(),
    rows: [
      { id: "row-1", name: "Row A", color: "#000" },
      { id: "row-2", name: "Row B", color: "#ccc" },
    ],
    columns: [
      { id: "col-1", name: "To Do" },
      { id: "col-2", name: "Done" },
    ],
    tasks: [task],
  };
}

const baseTask: Task = {
  id: "url-stable-task",
  rowId: "row-1",
  colId: "col-1",
  title: "Original title",
  description: "some desc",
  checklist: [],
};

// ── Task URL established on creation ─────────────────────────────────────────

describe("Task URL established on creation", () => {
  test("TASK/CREATE adds the task with the exact ID supplied in the payload", () => {
    const state = createInitialState();
    const task: Task = {
      id: "brand-new-task-id",
      rowId: "row-1",
      colId: "col-1",
      title: "New task",
      description: "",
      checklist: [],
    };
    const next = boardReducer(state, { type: "TASK/CREATE", payload: { task } });
    expect(next.tasks[0].id).toBe("brand-new-task-id");
  });

  test("TASK/CREATE does not alter any other task IDs", () => {
    const state = stateWithTask(baseTask);
    const newTask: Task = {
      id: "second-task",
      rowId: "row-1",
      colId: "col-1",
      title: "Second",
      description: "",
      checklist: [],
    };
    const next = boardReducer(state, { type: "TASK/CREATE", payload: { task: newTask } });
    const existing = next.tasks.find((t) => t.id === "url-stable-task");
    expect(existing).toBeDefined();
  });
});

// ── URL unchanged when task status (column) changes ───────────────────────────

describe("URL unchanged — status change", () => {
  test("TASK/MOVE_TO_COLUMN preserves task ID after column change", () => {
    const state = stateWithTask(baseTask);
    const next = boardReducer(state, {
      type: "TASK/MOVE_TO_COLUMN",
      payload: { taskId: "url-stable-task", colId: "col-2" },
    });
    expect(next.tasks[0].id).toBe("url-stable-task");
    expect(next.tasks[0].colId).toBe("col-2");
  });

  test("DRAG/DROP_TASK preserves task ID after drag-to-column", () => {
    const state: BoardState = {
      ...stateWithTask(baseTask),
      draggedTask: { taskId: "url-stable-task", rowId: "row-1", colId: "col-1" },
    };
    const next = boardReducer(state, {
      type: "DRAG/DROP_TASK",
      payload: { toRowId: "row-1", toColId: "col-2" },
    });
    expect(next.tasks[0].id).toBe("url-stable-task");
  });

  test("TASK/SAVE_EDIT with changed colId preserves task ID", () => {
    const state: BoardState = {
      ...stateWithTask(baseTask),
      editingTaskId: "url-stable-task",
      taskEditModalOpen: true,
      editTaskDraft: { ...baseTask, colId: "col-2" },
    };
    const next = boardReducer(state, { type: "TASK/SAVE_EDIT" });
    expect(next.tasks[0].id).toBe("url-stable-task");
    expect(next.tasks[0].colId).toBe("col-2");
  });
});

// ── URL unchanged when task row changes ───────────────────────────────────────

describe("URL unchanged — row change", () => {
  test("TASK/SAVE_EDIT with changed rowId preserves task ID", () => {
    const state: BoardState = {
      ...stateWithTask(baseTask),
      editingTaskId: "url-stable-task",
      taskEditModalOpen: true,
      editTaskDraft: { ...baseTask, rowId: "row-2" },
    };
    const next = boardReducer(state, { type: "TASK/SAVE_EDIT" });
    expect(next.tasks[0].id).toBe("url-stable-task");
    expect(next.tasks[0].rowId).toBe("row-2");
  });

  test("ROW/RENAME does not alter any task IDs", () => {
    const state = stateWithTask(baseTask);
    const next = boardReducer(state, {
      type: "ROW/RENAME",
      payload: { rowId: "row-1", name: "Renamed Row" },
    });
    expect(next.tasks[0].id).toBe("url-stable-task");
    expect(next.tasks[0].rowId).toBe("row-1");
  });
});

// ── URL unchanged on task edit save ──────────────────────────────────────────

describe("URL unchanged — task edit save", () => {
  test("TASK/SAVE_EDIT preserves task ID after title change", () => {
    const state: BoardState = {
      ...stateWithTask(baseTask),
      editingTaskId: "url-stable-task",
      taskEditModalOpen: true,
      editTaskDraft: { ...baseTask, title: "Updated title" },
    };
    const next = boardReducer(state, { type: "TASK/SAVE_EDIT" });
    expect(next.tasks[0].id).toBe("url-stable-task");
    expect(next.tasks[0].title).toBe("Updated title");
  });

  test("TASK/SAVE_EDIT preserves task ID after simultaneous row, column, and title change", () => {
    const state: BoardState = {
      ...stateWithTask(baseTask),
      editingTaskId: "url-stable-task",
      taskEditModalOpen: true,
      editTaskDraft: {
        ...baseTask,
        title: "Fully edited",
        rowId: "row-2",
        colId: "col-2",
      },
    };
    const next = boardReducer(state, { type: "TASK/SAVE_EDIT" });
    expect(next.tasks[0].id).toBe("url-stable-task");
    expect(next.tasks[0].title).toBe("Fully edited");
    expect(next.tasks[0].rowId).toBe("row-2");
    expect(next.tasks[0].colId).toBe("col-2");
  });

  test("TASK/SAVE_EDIT with blank title is a no-op — task ID unchanged", () => {
    const state: BoardState = {
      ...stateWithTask(baseTask),
      editingTaskId: "url-stable-task",
      taskEditModalOpen: true,
      editTaskDraft: { ...baseTask, title: "   " },
    };
    const next = boardReducer(state, { type: "TASK/SAVE_EDIT" });
    expect(next.tasks[0].id).toBe("url-stable-task");
    expect(next.tasks[0].title).toBe("Original title");
  });

  test("TASK/SAVE_EDIT clears editingTaskId and closes modal", () => {
    const state: BoardState = {
      ...stateWithTask(baseTask),
      editingTaskId: "url-stable-task",
      taskEditModalOpen: true,
      editTaskDraft: { ...baseTask, title: "Done" },
    };
    const next = boardReducer(state, { type: "TASK/SAVE_EDIT" });
    expect(next.editingTaskId).toBeNull();
    expect(next.taskEditModalOpen).toBe(false);
  });
});
