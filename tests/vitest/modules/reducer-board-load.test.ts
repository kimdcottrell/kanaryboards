import { describe, expect, test } from "vitest";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import type {
  Column,
  StoredColumn,
  StoredTask,
  Task,
} from "@components/context/types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

const column = (overrides: Partial<Column>): Column => ({
  id: "col-1",
  title: "To Do",
  order: "a0",
  pinnedToShortcut: false,
  pinnedToDock: false,
  icon: null,
  iconInBoardMenu: false,
  iconNearColumnTitle: false,
  isTrash: false,
  ...overrides,
});

const load = (columns: StoredColumn[], tasks: StoredTask[] = []) =>
  boardReducer(createInitialState(), {
    type: "BOARD/LOAD",
    payload: { rows: [], columns, tasks },
  });

describe("BOARD/LOAD", () => {
  test("backfills pin/icon/isTrash fields missing from legacy columns", () => {
    const legacy: StoredColumn = { id: "col-1", title: "To Do", order: "a0" };
    const state = load([legacy]);
    expect(state.columns[0]).toEqual(column({}));
  });

  test("keeps existing pin/icon values", () => {
    const col = column({
      title: "In Progress",
      pinnedToShortcut: true,
      pinnedToDock: true,
      icon: "hugeicons--rocket-01",
      iconInBoardMenu: true,
      iconNearColumnTitle: true,
    });
    expect(load([col]).columns[0]).toEqual(col);
  });

  test("appends a Trash column, last, to boards without one", () => {
    const state = load([column({}), column({ id: "col-2", order: "a1" })]);
    expect(state.columns).toHaveLength(3);
    const trash = state.columns[2];
    expect(trash).toMatchObject({ title: "Trash", isTrash: true });
    expect(trash.order > "a1").toBe(true);
  });

  test("keeps an existing Trash column last regardless of its order", () => {
    const trash = column({
      id: "trash",
      title: "Trash",
      order: "a0",
      isTrash: true,
    });
    const state = load([trash, column({ id: "col-2", order: "a5" })]);
    expect(state.columns.map((c) => c.id)).toEqual(["col-2", "trash"]);
  });

  test("backfills trashedAt/preTrashColId and drops expired Trash tasks", () => {
    const trash = column({
      id: "trash",
      title: "Trash",
      order: "a1",
      isTrash: true,
    });
    const base = {
      rowId: "row-1",
      title: "t",
      description: "",
      checklist: [],
      order: "a0",
    };
    const legacy: StoredTask = { ...base, id: "legacy", colId: "col-1" };
    const fresh: Task = {
      ...base,
      id: "fresh",
      colId: "trash",
      trashedAt: new Date(Date.now() - 29 * DAY_MS).toISOString(),
      preTrashColId: "col-1",
    };
    const expired: Task = {
      ...fresh,
      id: "expired",
      trashedAt: new Date(Date.now() - 30 * DAY_MS).toISOString(),
    };
    const state = load([column({}), trash], [legacy, fresh, expired]);
    expect(state.tasks.map((t) => t.id)).toEqual(["legacy", "fresh"]);
    expect(state.tasks[0]).toMatchObject({
      trashedAt: null,
      preTrashColId: null,
    });
  });
});

describe("BOARD/RESET", () => {
  test("seeds the default columns with Trash last", () => {
    const state = boardReducer(createInitialState(), { type: "BOARD/RESET" });
    expect(state.columns.map((c) => c.title)).toEqual([
      "To Do",
      "In Progress",
      "Review",
      "Done",
      "Trash",
    ]);
    expect(state.columns.map((c) => c.isTrash)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
  });
});
