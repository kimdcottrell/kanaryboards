import { describe, expect, test } from "vitest";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import type { BoardState, Column } from "@components/context/types.ts";

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

const state = (columns: Column[]): BoardState => ({
  ...createInitialState(),
  columns,
});

describe("TASK/OPEN_CREATE_MODAL", () => {
  test("keeps the given column", () => {
    const next = boardReducer(
      state([column("col-1", "a0"), column("col-2", "a1")]),
      {
        type: "TASK/OPEN_CREATE_MODAL",
        payload: { rowId: "row-1", colId: "col-2" },
      },
    );
    expect(next.taskDraft.colId).toBe("col-2");
  });

  test("defaults to the first non-Trash column when none is given", () => {
    const next = boardReducer(
      state([column("trash", "Zz", true), column("col-1", "a0")]),
      { type: "TASK/OPEN_CREATE_MODAL", payload: { rowId: "", colId: "" } },
    );
    expect(next.taskDraft.colId).toBe("col-1");
  });
});
