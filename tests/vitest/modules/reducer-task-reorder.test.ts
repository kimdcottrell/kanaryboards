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
