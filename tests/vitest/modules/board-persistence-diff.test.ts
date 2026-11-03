import { describe, expect, test } from "vitest";
import {
  chunkChanges,
  diffBoard,
  toSavedBoard,
} from "@components/react/context/effects/useBoardPersistence.ts";
import type { Column, Row, Task } from "@components/react/context/types.ts";

const row: Row = { id: "row-1", title: "Project", color: "", order: "a0" };
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
const task = (id: string, title = "t"): Task => ({
  id,
  rowId: "row-1",
  colId: "col-1",
  title,
  description: "",
  checklist: [],
  order: "a0",
  trashedAt: null,
  preTrashColId: null,
});
const board = {
  rows: [row],
  columns: [column],
  tasks: [task("a"), task("b")],
};

describe("diffBoard", () => {
  test("returns null when nothing changed", () => {
    expect(diffBoard(toSavedBoard(board), board)).toBeNull();
  });

  test("returns null for equal copies, not just the same objects", () => {
    expect(diffBoard(toSavedBoard(structuredClone(board)), board)).toBeNull();
  });

  test("upserts only the changed and added entities", () => {
    const next = {
      ...board,
      tasks: [task("a", "edited"), task("b"), task("c")],
    };
    expect(diffBoard(toSavedBoard(board), next)).toEqual({
      upserts: { rows: [], columns: [], tasks: [next.tasks[0], next.tasks[2]] },
      deletes: { rowIds: [], columnIds: [], taskIds: [] },
    });
  });

  test("deletes entities no longer on the board", () => {
    const next = { rows: [], columns: [column], tasks: [] };
    expect(diffBoard(toSavedBoard(board), next)).toEqual({
      upserts: { rows: [], columns: [], tasks: [] },
      deletes: { rowIds: ["row-1"], columnIds: [], taskIds: ["a", "b"] },
    });
  });

  test("upserts fields BOARD/LOAD backfilled onto a legacy entity", () => {
    const { trashedAt: _t, preTrashColId: _p, ...legacy } = task("a");
    const saved = toSavedBoard({
      rows: [row],
      columns: [column],
      tasks: [legacy],
    });
    expect(diffBoard(saved, { ...board, tasks: [task("a")] })?.upserts.tasks)
      .toEqual([task("a")]);
  });
});

describe("chunkChanges", () => {
  const noUpserts = { rows: [], columns: [], tasks: [] };
  const noDeletes = { rowIds: [], columnIds: [], taskIds: [] };

  test("keeps changes within the limit in one chunk", () => {
    const changes = {
      upserts: { ...noUpserts, tasks: [task("a")] },
      deletes: { ...noDeletes, taskIds: ["b"] },
    };
    expect(chunkChanges(changes, 2)).toEqual([changes]);
  });

  test("splits in order: rows, columns, tasks, then deletes", () => {
    const changes = {
      upserts: { rows: [row], columns: [column], tasks: [task("a")] },
      deletes: { rowIds: ["r2"], columnIds: [], taskIds: ["b"] },
    };
    expect(chunkChanges(changes, 2)).toEqual([
      {
        upserts: { rows: [row], columns: [column], tasks: [] },
        deletes: noDeletes,
      },
      {
        upserts: { ...noUpserts, tasks: [task("a")] },
        deletes: { ...noDeletes, rowIds: ["r2"] },
      },
      {
        upserts: noUpserts,
        deletes: { ...noDeletes, taskIds: ["b"] },
      },
    ]);
  });
});
