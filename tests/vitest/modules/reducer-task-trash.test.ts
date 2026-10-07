import { describe, expect, test } from "vitest";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import type { BoardState, Column, Task } from "@components/context/types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

const column = (id: string, order: string, isTrash = false): Column => ({
  id,
  title: isTrash ? "Trash" : id,
  order,
  pinnedToShortcut: false,
  pinnedToDock: false,
  icon: null,
  iconInBoardMenu: false,
  iconNearColumnTitle: false,
  isTrash,
});

const task = (overrides: Partial<Task>): Task => ({
  id: "t1",
  rowId: "row-1",
  colId: "col-1",
  order: "a0",
  title: "t1",
  description: "",
  checklist: [],
  trashedAt: null,
  preTrashColId: null,
  ...overrides,
});

const TRASHED_AT = "2026-10-01T00:00:00.000Z";

function state(tasks: Task[], columns?: Column[]): BoardState {
  return {
    ...createInitialState(),
    rows: [
      { id: "row-1", title: "A", color: "#000", order: "a0" },
      { id: "row-2", title: "B", color: "#000", order: "a1" },
    ],
    columns: columns ??
      [
        column("col-1", "a0"),
        column("col-2", "a1"),
        column("trash", "a2", true),
      ],
    tasks,
  };
}

const find = (s: BoardState, id = "t1") => s.tasks.find((t) => t.id === id)!;

// ── TASK/TRASH ────────────────────────────────────────────────────────────────

describe("TASK/TRASH", () => {
  test("moves the task to Trash in its row, stamping when and where from", () => {
    const before = state([
      task({ colId: "col-2" }),
      task({ id: "t2", colId: "trash", order: "a5", trashedAt: TRASHED_AT }),
    ]);
    const next = boardReducer(
      { ...before, editingTaskId: "t1", taskEditModalOpen: true },
      { type: "TASK/TRASH", payload: { taskId: "t1" } },
    );
    const t = find(next);
    expect(t).toMatchObject({
      colId: "trash",
      rowId: "row-1",
      preTrashColId: "col-2",
    });
    expect(Date.parse(t.trashedAt!)).toBeGreaterThan(Date.parse(TRASHED_AT));
    expect(t.order > "a5").toBe(true); // end of the Trash cell
    expect(next.taskEditModalOpen).toBe(false);
    expect(next.editingTaskId).toBeNull();
  });
});

// ── TASK/RESTORE ──────────────────────────────────────────────────────────────

describe("TASK/RESTORE", () => {
  test("returns the task to its pre-trash column and clears trash state", () => {
    const next = boardReducer(
      state([
        task({ colId: "trash", trashedAt: TRASHED_AT, preTrashColId: "col-2" }),
      ]),
      { type: "TASK/RESTORE", payload: { taskId: "t1" } },
    );
    expect(find(next)).toMatchObject({
      colId: "col-2",
      rowId: "row-1",
      trashedAt: null,
      preTrashColId: null,
    });
  });

  test("falls back to the To Do column when the pre-trash column is gone", () => {
    const columns = [
      column("col-2", "a1"),
      { ...column("todo", "a0"), title: "To Do" },
      column("trash", "a2", true),
    ];
    const next = boardReducer(
      state(
        [task({
          colId: "trash",
          trashedAt: TRASHED_AT,
          preTrashColId: "deleted",
        })],
        columns,
      ),
      { type: "TASK/RESTORE", payload: { taskId: "t1" } },
    );
    expect(find(next).colId).toBe("todo");
  });
});

// ── TASK/DROP_ON_CELL ─────────────────────────────────────────────────────────

describe("TASK/DROP_ON_CELL with Trash", () => {
  const drop = (t: Task, toRowId: string, toColId: string) =>
    boardReducer(
      { ...state([t]), draggedTask: t },
      {
        type: "TASK/DROP_ON_CELL",
        payload: { toRowId, toColId, beforeTaskId: null },
      },
    );

  test("dragging into Trash stamps trashedAt and preTrashColId", () => {
    const t = find(drop(task({ colId: "col-2" }), "row-1", "trash"));
    expect(t.preTrashColId).toBe("col-2");
    expect(t.trashedAt).not.toBeNull();
  });

  test("dragging out of Trash clears both", () => {
    const t = find(
      drop(
        task({ colId: "trash", trashedAt: TRASHED_AT, preTrashColId: "col-2" }),
        "row-1",
        "col-1",
      ),
    );
    expect(t).toMatchObject({
      colId: "col-1",
      trashedAt: null,
      preTrashColId: null,
    });
  });

  test("dragging between rows' Trash cells keeps the original stamp", () => {
    const t = find(
      drop(
        task({ colId: "trash", trashedAt: TRASHED_AT, preTrashColId: "col-2" }),
        "row-2",
        "trash",
      ),
    );
    expect(t).toMatchObject({
      rowId: "row-2",
      trashedAt: TRASHED_AT,
      preTrashColId: "col-2",
    });
  });
});
