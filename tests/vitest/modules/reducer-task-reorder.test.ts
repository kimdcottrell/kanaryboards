import { describe, expect, test } from "vitest";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import type { BoardState, Task } from "@components/context/types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

const task = (id: string, order: string): Task => ({
  id,
  rowId: "row-1",
  colId: "col-1",
  order,
  title: id,
  description: "",
  checklist: [],
});

// Three tasks in the same cell (row-1 / col-1), ordered t1 < t2 < t3.
function stateWithCell(): BoardState {
  return {
    ...createInitialState(),
    rows: [{ id: "row-1", title: "Row A", color: "#000", order: "a0" }],
    columns: [{ id: "col-1", title: "To Do", order: "a0" }],
    tasks: [task("t1", "a0"), task("t2", "a1"), task("t3", "a2")],
  };
}

// Ids of the cell's tasks in display (order) order.
const orderedIds = (state: BoardState): string[] =>
  [...state.tasks]
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    .map((t) => t.id);

// ── TASK/REORDER_IN_CELL ──────────────────────────────────────────────────────

describe("TASK/REORDER_IN_CELL", () => {
  test("moves the first task to the end (beforeTaskId null)", () => {
    const next = boardReducer(stateWithCell(), {
      type: "TASK/REORDER_IN_CELL",
      payload: { taskId: "t1", beforeTaskId: null },
    });
    expect(orderedIds(next)).toEqual(["t2", "t3", "t1"]);
  });

  test("moves the last task before the middle task", () => {
    const next = boardReducer(stateWithCell(), {
      type: "TASK/REORDER_IN_CELL",
      payload: { taskId: "t3", beforeTaskId: "t2" },
    });
    expect(orderedIds(next)).toEqual(["t1", "t3", "t2"]);
  });

  test("only the moved task's order changes", () => {
    const before = stateWithCell();
    const next = boardReducer(before, {
      type: "TASK/REORDER_IN_CELL",
      payload: { taskId: "t1", beforeTaskId: null },
    });
    const order = (s: BoardState, id: string) =>
      s.tasks.find((t) => t.id === id)!.order;
    expect(order(next, "t2")).toBe(order(before, "t2"));
    expect(order(next, "t3")).toBe(order(before, "t3"));
    expect(order(next, "t1")).not.toBe(order(before, "t1"));
  });

  test("dropping a task onto itself is a no-op and clears the drag", () => {
    const state: BoardState = {
      ...stateWithCell(),
      draggedTask: task("t1", "a0"),
    };
    const next = boardReducer(state, {
      type: "TASK/REORDER_IN_CELL",
      payload: { taskId: "t1", beforeTaskId: "t1" },
    });
    expect(orderedIds(next)).toEqual(["t1", "t2", "t3"]);
    expect(next.draggedTask).toBeNull();
  });

  test("clears draggedTask after a valid reorder", () => {
    const state: BoardState = {
      ...stateWithCell(),
      draggedTask: task("t1", "a0"),
    };
    const next = boardReducer(state, {
      type: "TASK/REORDER_IN_CELL",
      payload: { taskId: "t1", beforeTaskId: null },
    });
    expect(next.draggedTask).toBeNull();
  });

  test("an unknown task id is a no-op (drag cleared)", () => {
    const next = boardReducer(stateWithCell(), {
      type: "TASK/REORDER_IN_CELL",
      payload: { taskId: "nope", beforeTaskId: "t2" },
    });
    expect(orderedIds(next)).toEqual(["t1", "t2", "t3"]);
    expect(next.draggedTask).toBeNull();
  });
});

// ── TASK/DROP_ON_CELL ────────────────────────────────────────────────────────

// One dragged task in col-1, and three ordered tasks (t1 < t2 < t3) in col-2,
// both in row-1.
function stateWithTwoColumns(): BoardState {
  return {
    ...createInitialState(),
    rows: [{ id: "row-1", title: "Row A", color: "#000", order: "a0" }],
    columns: [
      { id: "col-1", title: "To Do", order: "a0" },
      { id: "col-2", title: "Done", order: "a1" },
    ],
    tasks: [
      { ...task("dragged", "a0"), colId: "col-1" },
      { ...task("t1", "a0"), colId: "col-2" },
      { ...task("t2", "a1"), colId: "col-2" },
      { ...task("t3", "a2"), colId: "col-2" },
    ],
  };
}

const orderedIdsInCol = (state: BoardState, colId: string): string[] =>
  [...state.tasks]
    .filter((t) => t.colId === colId)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    .map((t) => t.id);

describe("TASK/DROP_ON_CELL", () => {
  test("inserts the dragged task at the drop-indicator position", () => {
    const state: BoardState = {
      ...stateWithTwoColumns(),
      draggedTask: { ...task("dragged", "a0"), colId: "col-1" },
    };
    const next = boardReducer(state, {
      type: "TASK/DROP_ON_CELL",
      payload: { toRowId: "row-1", toColId: "col-2", beforeTaskId: "t2" },
    });
    expect(orderedIdsInCol(next, "col-2")).toEqual([
      "t1",
      "dragged",
      "t2",
      "t3",
    ]);
    expect(next.tasks.find((t) => t.id === "dragged")!.colId).toBe("col-2");
  });

  test("appends to the end when beforeTaskId is null", () => {
    const state: BoardState = {
      ...stateWithTwoColumns(),
      draggedTask: { ...task("dragged", "a0"), colId: "col-1" },
    };
    const next = boardReducer(state, {
      type: "TASK/DROP_ON_CELL",
      payload: { toRowId: "row-1", toColId: "col-2", beforeTaskId: null },
    });
    expect(orderedIdsInCol(next, "col-2")).toEqual([
      "t1",
      "t2",
      "t3",
      "dragged",
    ]);
  });

  test("clears draggedTask after a cross-column drop", () => {
    const state: BoardState = {
      ...stateWithTwoColumns(),
      draggedTask: { ...task("dragged", "a0"), colId: "col-1" },
    };
    const next = boardReducer(state, {
      type: "TASK/DROP_ON_CELL",
      payload: { toRowId: "row-1", toColId: "col-2", beforeTaskId: "t1" },
    });
    expect(next.draggedTask).toBeNull();
  });
});

// ── TASK/DROP_ON_CELL across rows ────────────────────────────────────────────

// One dragged task in row-1/col-1, three ordered tasks (t1 < t2 < t3) in
// row-2/col-1, and one task (other) in row-2/col-2. Two rows, two columns.
function stateWithTwoRows(): BoardState {
  return {
    ...createInitialState(),
    rows: [
      { id: "row-1", title: "Row A", color: "#000", order: "a0" },
      { id: "row-2", title: "Row B", color: "#111", order: "a1" },
    ],
    columns: [
      { id: "col-1", title: "To Do", order: "a0" },
      { id: "col-2", title: "Done", order: "a1" },
    ],
    tasks: [
      { ...task("dragged", "a0"), rowId: "row-1", colId: "col-1" },
      { ...task("t1", "a0"), rowId: "row-2", colId: "col-1" },
      { ...task("t2", "a1"), rowId: "row-2", colId: "col-1" },
      { ...task("t3", "a2"), rowId: "row-2", colId: "col-1" },
      { ...task("other", "a0"), rowId: "row-2", colId: "col-2" },
    ],
  };
}

const orderedIdsInRowCol = (
  state: BoardState,
  rowId: string,
  colId: string,
): string[] =>
  [...state.tasks]
    .filter((t) => t.rowId === rowId && t.colId === colId)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    .map((t) => t.id);

describe("TASK/DROP_ON_CELL across rows", () => {
  test("moves to a different row, same column, at the drop-indicator position", () => {
    const state: BoardState = {
      ...stateWithTwoRows(),
      draggedTask: { ...task("dragged", "a0"), rowId: "row-1", colId: "col-1" },
    };
    const next = boardReducer(state, {
      type: "TASK/DROP_ON_CELL",
      payload: { toRowId: "row-2", toColId: "col-1", beforeTaskId: "t2" },
    });
    expect(orderedIdsInRowCol(next, "row-2", "col-1")).toEqual([
      "t1",
      "dragged",
      "t2",
      "t3",
    ]);
    const moved = next.tasks.find((t) => t.id === "dragged")!;
    expect(moved.rowId).toBe("row-2");
    expect(moved.colId).toBe("col-1");
    expect(next.draggedTask).toBeNull();
  });

  test("moves to a different row and a different column", () => {
    const state: BoardState = {
      ...stateWithTwoRows(),
      draggedTask: { ...task("dragged", "a0"), rowId: "row-1", colId: "col-1" },
    };
    const next = boardReducer(state, {
      type: "TASK/DROP_ON_CELL",
      payload: { toRowId: "row-2", toColId: "col-2", beforeTaskId: null },
    });
    expect(orderedIdsInRowCol(next, "row-2", "col-2")).toEqual([
      "other",
      "dragged",
    ]);
    expect(orderedIdsInRowCol(next, "row-2", "col-1")).toEqual([
      "t1",
      "t2",
      "t3",
    ]);
    const moved = next.tasks.find((t) => t.id === "dragged")!;
    expect(moved.rowId).toBe("row-2");
    expect(moved.colId).toBe("col-2");
    expect(next.draggedTask).toBeNull();
  });

  test("dropping into the exact same cell (same row and column) is a no-op", () => {
    const state: BoardState = {
      ...stateWithTwoRows(),
      draggedTask: { ...task("dragged", "a0"), rowId: "row-1", colId: "col-1" },
    };
    const next = boardReducer(state, {
      type: "TASK/DROP_ON_CELL",
      payload: { toRowId: "row-1", toColId: "col-1", beforeTaskId: null },
    });
    const moved = next.tasks.find((t) => t.id === "dragged")!;
    expect(moved.rowId).toBe("row-1");
    expect(moved.colId).toBe("col-1");
    expect(moved.order).toBe("a0");
    expect(next.draggedTask).toBeNull();
  });
});
