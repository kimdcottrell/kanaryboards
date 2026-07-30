import { env } from "cloudflare:test";
import { beforeEach, describe, expect, test } from "vitest";
import {
  deleteBoard,
  getBoard,
  getBoardIdForUser,
  saveBoard,
  setBoardIdForUser,
} from "@lib/db/kv.ts";
import type { PersistedBoard } from "@lib/db/kv.ts";

const kv = env.BOARD_KV;

beforeEach(async () => {
  const { keys } = await kv.list();
  await Promise.all(keys.map((key) => kv.delete(key.name)));
});

const boardId = "test-board-001";

const sampleBoard: PersistedBoard = {
  rows: [{ id: "row-1", title: "Feature", color: "#ff6b6b", order: "a0" }],
  columns: [
    {
      id: "col-1",
      title: "To Do",
      order: "a0",
      pinnedToShortcut: false,
      pinnedToDock: false,
      icon: null,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
    {
      id: "col-2",
      title: "Done",
      order: "a1",
      pinnedToShortcut: false,
      pinnedToDock: false,
      icon: null,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
  ],
  tasks: [
    {
      id: "task-a",
      rowId: "row-1",
      colId: "col-1",
      order: "a0",
      title: "Write tests",
      description: "Important work",
      checklist: [{
        id: "item-1",
        text: "Step one",
        order: "a0",
        checked: false,
      }],
    },
    {
      id: "task-b",
      rowId: "row-1",
      colId: "col-2",
      order: "a0",
      title: "Deploy",
      description: "",
      checklist: [],
    },
  ],
};

// ── saveBoard / getBoard ──────────────────────────────────────────────────────

describe("saveBoard / getBoard", () => {
  test("getBoard returns the persisted board after saveBoard", async () => {
    await saveBoard(kv, boardId, sampleBoard);
    const board = await getBoard(kv, boardId);
    expect(board?.tasks).toHaveLength(2);
    expect(board?.tasks[0].id).toBe("task-a");
  });

  test("getBoard returns null when no board has been saved", async () => {
    expect(await getBoard(kv, "nonexistent")).toBeNull();
  });

  test("overwrites the board on a second saveBoard call", async () => {
    await saveBoard(kv, boardId, sampleBoard);
    const updated: PersistedBoard = {
      ...sampleBoard,
      tasks: [{ ...sampleBoard.tasks[0], title: "Write better tests" }],
    };
    await saveBoard(kv, boardId, updated);
    const board = await getBoard(kv, boardId);
    expect(board?.tasks).toHaveLength(1);
    expect(board?.tasks[0].title).toBe("Write better tests");
  });

  test("board preserves row title and order fields", async () => {
    await saveBoard(kv, boardId, sampleBoard);
    const board = await getBoard(kv, boardId);
    expect(board?.rows[0].title).toBe("Feature");
    expect(board?.rows[0].order).toBe("a0");
  });

  test("board preserves column title and order fields", async () => {
    await saveBoard(kv, boardId, sampleBoard);
    const board = await getBoard(kv, boardId);
    expect(board?.columns[1].title).toBe("Done");
    expect(board?.columns[1].order).toBe("a1");
  });

  test("board preserves task order field", async () => {
    await saveBoard(kv, boardId, sampleBoard);
    const board = await getBoard(kv, boardId);
    expect(board?.tasks[0].order).toBe("a0");
  });
});

// ── deleteBoard ───────────────────────────────────────────────────────────────

describe("deleteBoard", () => {
  test("removes the board entry so getBoard returns null", async () => {
    await saveBoard(kv, boardId, sampleBoard);
    await deleteBoard(kv, boardId);
    expect(await getBoard(kv, boardId)).toBeNull();
  });

  test("does not throw when deleting a board that does not exist", async () => {
    await expect(deleteBoard(kv, "never-existed")).resolves.not.toThrow();
  });

  test("does not affect other boards", async () => {
    const otherBoardId = "other-board";
    await saveBoard(kv, boardId, sampleBoard);
    await saveBoard(kv, otherBoardId, sampleBoard);
    await deleteBoard(kv, boardId);
    expect(await getBoard(kv, otherBoardId)).not.toBeNull();
  });
});

// ── user_board mapping ────────────────────────────────────────────────────────

describe("getBoardIdForUser / setBoardIdForUser", () => {
  test("returns null when no mapping has been set", async () => {
    expect(await getBoardIdForUser(kv, "user-xyz")).toBeNull();
  });

  test("returns the boardId after it has been set", async () => {
    await setBoardIdForUser(kv, "user-abc", boardId);
    expect(await getBoardIdForUser(kv, "user-abc")).toBe(boardId);
  });

  test("each userId maps to its own boardId independently", async () => {
    await setBoardIdForUser(kv, "user-1", "board-111");
    await setBoardIdForUser(kv, "user-2", "board-222");
    expect(await getBoardIdForUser(kv, "user-1")).toBe("board-111");
    expect(await getBoardIdForUser(kv, "user-2")).toBe("board-222");
  });

  test("overwrites an existing mapping on a second call", async () => {
    await setBoardIdForUser(kv, "user-abc", "old-board");
    await setBoardIdForUser(kv, "user-abc", "new-board");
    expect(await getBoardIdForUser(kv, "user-abc")).toBe("new-board");
  });
});
