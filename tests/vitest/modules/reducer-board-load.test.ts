import { describe, expect, test } from "vitest";
import {
  boardReducer,
  createInitialState,
} from "@components/context/reducer.ts";
import type { Column } from "@components/context/types.ts";

describe("BOARD/LOAD", () => {
  test("backfills pin/icon fields missing from legacy columns", () => {
    const legacy = { id: "col-1", title: "To Do", order: "a0" } as Column;
    const state = boardReducer(createInitialState(), {
      type: "BOARD/LOAD",
      payload: { rows: [], columns: [legacy], tasks: [] },
    });
    expect(state.columns).toEqual([{
      id: "col-1",
      title: "To Do",
      order: "a0",
      pinnedToShortcut: false,
      pinnedToDock: false,
      icon: null,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    }]);
  });

  test("keeps existing pin/icon values", () => {
    const column: Column = {
      id: "col-1",
      title: "In Progress",
      order: "a0",
      pinnedToShortcut: true,
      pinnedToDock: true,
      icon: "hugeicons--rocket-01",
      iconInBoardMenu: true,
      iconNearColumnTitle: true,
    };
    const state = boardReducer(createInitialState(), {
      type: "BOARD/LOAD",
      payload: { rows: [], columns: [column], tasks: [] },
    });
    expect(state.columns).toEqual([column]);
  });
});
