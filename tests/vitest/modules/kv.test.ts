// @vitest-environment node
import { beforeEach, afterEach, describe, test, expect } from "vitest";
import {
  saveBoard,
  saveTaskMetas,
  getBoard,
  getTaskMeta,
  deleteBoard,
  _setKvForTest,
} from "@lib/kv.ts";
import type { PersistedBoard } from "@lib/kv.ts";

let memKv: Deno.Kv;

beforeEach(async () => {
  memKv = await Deno.openKv(":memory:");
  _setKvForTest(memKv);
});

afterEach(async () => {
  await memKv.close();
});

const boardId = "test-board-001";

const sampleBoard: PersistedBoard = {
  rows: [{ id: "row-1", name: "Feature", color: "#ff6b6b" }],
  columns: [
    { id: "col-1", name: "To Do" },
    { id: "col-2", name: "Done" },
  ],
  tasks: [
    {
      id: "task-a",
      rowId: "row-1",
      colId: "col-1",
      title: "Write tests",
      description: "Important work",
      checklist: [],
    },
    {
      id: "task-b",
      rowId: "row-1",
      colId: "col-2",
      title: "Deploy",
      description: "",
      checklist: [],
    },
  ],
  defaultColumnNames: ["To Do", "Done"],
};

// ── saveBoard ────────────────────────────────────────────────────────────────

describe("saveBoard — task_meta entries", () => {
  test("writes a task_meta entry for each task", async () => {
    await saveBoard(boardId, sampleBoard);
    const metaA = await getTaskMeta("task-a");
    const metaB = await getTaskMeta("task-b");
    expect(metaA).not.toBeNull();
    expect(metaB).not.toBeNull();
  });

  test("task_meta contains the correct title", async () => {
    await saveBoard(boardId, sampleBoard);
    expect((await getTaskMeta("task-a"))?.title).toBe("Write tests");
  });

  test("task_meta contains the correct description", async () => {
    await saveBoard(boardId, sampleBoard);
    expect((await getTaskMeta("task-a"))?.description).toBe("Important work");
  });

  test("task_meta contains the boardId (O(1) SSR lookup key)", async () => {
    await saveBoard(boardId, sampleBoard);
    expect((await getTaskMeta("task-a"))?.boardId).toBe(boardId);
  });

  test("each task gets its own distinct task_meta entry", async () => {
    await saveBoard(boardId, sampleBoard);
    const metaA = await getTaskMeta("task-a");
    const metaB = await getTaskMeta("task-b");
    expect(metaA?.title).toBe("Write tests");
    expect(metaB?.title).toBe("Deploy");
  });

  test("overwrites task_meta title when board is re-saved with updated task", async () => {
    await saveBoard(boardId, sampleBoard);
    const updated: PersistedBoard = {
      ...sampleBoard,
      tasks: [
        { ...sampleBoard.tasks[0], title: "Write better tests" },
        sampleBoard.tasks[1],
      ],
    };
    await saveBoard(boardId, updated);
    expect((await getTaskMeta("task-a"))?.title).toBe("Write better tests");
  });
});

describe("saveBoard — board entry", () => {
  test("getBoard returns the persisted board after saveBoard", async () => {
    await saveBoard(boardId, sampleBoard);
    const board = await getBoard(boardId);
    expect(board?.tasks).toHaveLength(2);
    expect(board?.tasks[0].id).toBe("task-a");
  });

  test("task IDs in the stored board match the task_meta keys", async () => {
    await saveBoard(boardId, sampleBoard);
    const board = await getBoard(boardId);
    for (const task of board!.tasks) {
      const meta = await getTaskMeta(task.id);
      expect(meta).not.toBeNull();
      expect(meta?.title).toBe(task.title);
    }
  });
});

describe("saveBoard — writeTaskMeta: false", () => {
  test("does not write task_meta entries", async () => {
    await saveBoard(boardId, sampleBoard, { writeTaskMeta: false });
    expect(await getTaskMeta("task-a")).toBeNull();
    expect(await getTaskMeta("task-b")).toBeNull();
  });

  test("still persists the board entry", async () => {
    await saveBoard(boardId, sampleBoard, { writeTaskMeta: false });
    const board = await getBoard(boardId);
    expect(board?.tasks).toHaveLength(2);
  });
});

// ── saveTaskMetas ─────────────────────────────────────────────────────────────

describe("saveTaskMetas", () => {
  test("writes a task_meta entry for each supplied task", async () => {
    await saveTaskMetas(boardId, [
      { id: "task-a", title: "Write tests", description: "Important work" },
      { id: "task-b", title: "Deploy", description: "" },
    ]);
    expect(await getTaskMeta("task-a")).not.toBeNull();
    expect(await getTaskMeta("task-b")).not.toBeNull();
  });

  test("stores the correct title and description", async () => {
    await saveTaskMetas(boardId, [
      { id: "task-a", title: "Write tests", description: "Important work" },
    ]);
    expect((await getTaskMeta("task-a"))?.title).toBe("Write tests");
    expect((await getTaskMeta("task-a"))?.description).toBe("Important work");
  });

  test("associates the boardId on each entry", async () => {
    await saveTaskMetas(boardId, [
      { id: "task-a", title: "Write tests", description: "" },
    ]);
    expect((await getTaskMeta("task-a"))?.boardId).toBe(boardId);
  });

  test("is independent of saveBoard — writes meta without touching board entry", async () => {
    await saveTaskMetas(boardId, [
      { id: "task-a", title: "Write tests", description: "" },
    ]);
    expect(await getBoard(boardId)).toBeNull();
  });
});

// ── getTaskMeta ───────────────────────────────────────────────────────────────

describe("getTaskMeta", () => {
  test("returns null for an unknown taskId (no board saved yet)", async () => {
    expect(await getTaskMeta("nonexistent-task")).toBeNull();
  });

  test("returns the full TaskMeta shape after saveBoard", async () => {
    await saveBoard(boardId, sampleBoard);
    const meta = await getTaskMeta("task-b");
    expect(meta).toEqual({ title: "Deploy", description: "", boardId });
  });

  test("lookup by taskId is independent of which board the task belongs to", async () => {
    const otherBoardId = "other-board-999";
    const otherBoard: PersistedBoard = {
      ...sampleBoard,
      tasks: [{ id: "task-x", rowId: "row-1", colId: "col-1", title: "Other", description: "", checklist: [] }],
    };
    await saveBoard(boardId, sampleBoard);
    await saveBoard(otherBoardId, otherBoard);
    expect((await getTaskMeta("task-a"))?.boardId).toBe(boardId);
    expect((await getTaskMeta("task-x"))?.boardId).toBe(otherBoardId);
  });
});

// ── deleteBoard ───────────────────────────────────────────────────────────────

describe("deleteBoard", () => {
  test("removes the board entry so getBoard returns null", async () => {
    await saveBoard(boardId, sampleBoard);
    await deleteBoard(boardId);
    expect(await getBoard(boardId)).toBeNull();
  });

  test("removes all task_meta entries for the deleted board's tasks", async () => {
    await saveBoard(boardId, sampleBoard);
    await deleteBoard(boardId);
    expect(await getTaskMeta("task-a")).toBeNull();
    expect(await getTaskMeta("task-b")).toBeNull();
  });

  test("does not throw when deleting a board that does not exist", async () => {
    await expect(deleteBoard("never-existed")).resolves.not.toThrow();
  });

  test("leaves task_meta of other boards untouched", async () => {
    const otherBoardId = "other-board";
    const otherBoard: PersistedBoard = {
      ...sampleBoard,
      tasks: [{ id: "task-other", rowId: "row-1", colId: "col-1", title: "Safe", description: "", checklist: [] }],
    };
    await saveBoard(boardId, sampleBoard);
    await saveBoard(otherBoardId, otherBoard);
    await deleteBoard(boardId);
    expect(await getTaskMeta("task-other")).not.toBeNull();
  });
});
