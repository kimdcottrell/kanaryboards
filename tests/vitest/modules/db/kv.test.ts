// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  _setKvForTest,
  applyBoardChanges,
  deleteBoard,
  getBoard,
  getBoardIdForUser,
  getBoardRevision,
  getEntity,
  listTaskComments,
  purgeExpiredTrash,
  revisionCheck,
  saveEntity,
  saveTaskComment,
  setBoardIdForUser,
  watchBoard,
} from "@lib/db/kv.ts";
import type { PersistedBoard } from "@lib/types.ts";

let memKv: Deno.Kv;

beforeEach(async () => {
  memKv = await Deno.openKv(":memory:");
  _setKvForTest(memKv);
});

afterEach(() => {
  memKv.close();
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
      isTrash: false,
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
      isTrash: false,
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
      trashedAt: null,
      preTrashColId: null,
    },
    {
      id: "task-b",
      rowId: "row-1",
      colId: "col-2",
      order: "a0",
      title: "Deploy",
      description: "",
      checklist: [],
      trashedAt: null,
      preTrashColId: null,
    },
  ],
};

const noDeletes = { rowIds: [], columnIds: [], taskIds: [] };
const noUpserts: PersistedBoard = { rows: [], columns: [], tasks: [] };
const saveBoard = (id: string, board: PersistedBoard) =>
  applyBoardChanges(id, { upserts: board, deletes: noDeletes });

// ── applyBoardChanges / getBoard ──────────────────────────────────────────────

describe("applyBoardChanges / getBoard", () => {
  test("getBoard returns the persisted board after applyBoardChanges", async () => {
    await saveBoard(boardId, sampleBoard);
    const board = await getBoard(boardId);
    expect(board?.tasks).toHaveLength(2);
    expect(board?.tasks[0].id).toBe("task-a");
  });

  test("getBoard returns null when no board has been saved", async () => {
    expect(await getBoard("nonexistent")).toBeNull();
  });

  test("updates only the upserted entities", async () => {
    await saveBoard(boardId, sampleBoard);
    await applyBoardChanges(boardId, {
      upserts: {
        ...noUpserts,
        tasks: [{ ...sampleBoard.tasks[0], title: "Write better tests" }],
      },
      deletes: noDeletes,
    });
    const board = await getBoard(boardId);
    expect(board?.tasks.map((t) => t.title)).toEqual([
      "Write better tests",
      "Deploy",
    ]);
    expect(board?.rows).toEqual(sampleBoard.rows);
    expect(board?.columns).toEqual(sampleBoard.columns);
  });

  test("changes to different tasks from separate saves both persist", async () => {
    await saveBoard(boardId, sampleBoard);
    const [a, b] = sampleBoard.tasks;
    await applyBoardChanges(boardId, {
      upserts: { ...noUpserts, tasks: [{ ...a, title: "From phone" }] },
      deletes: noDeletes,
    });
    await applyBoardChanges(boardId, {
      upserts: { ...noUpserts, tasks: [{ ...b, title: "From laptop" }] },
      deletes: noDeletes,
    });
    const board = await getBoard(boardId);
    expect(board?.tasks.map((t) => t.title)).toEqual([
      "From phone",
      "From laptop",
    ]);
  });

  test("deletes only the named entities", async () => {
    await saveBoard(boardId, sampleBoard);
    await applyBoardChanges(boardId, {
      upserts: noUpserts,
      deletes: { rowIds: [], columnIds: ["col-2"], taskIds: ["task-b"] },
    });
    const board = await getBoard(boardId);
    expect(board?.columns.map((c) => c.id)).toEqual(["col-1"]);
    expect(board?.tasks.map((t) => t.id)).toEqual(["task-a"]);
    expect(board?.rows).toEqual(sampleBoard.rows);
  });

  test("splits changes past one commit's 1000-mutation limit", async () => {
    const tasks = Array.from({ length: 1500 }, (_, i) => ({
      ...sampleBoard.tasks[1],
      id: `task-${String(i).padStart(4, "0")}`,
    }));
    await saveBoard(boardId, { ...sampleBoard, tasks });
    expect((await getBoard(boardId))?.tasks).toHaveLength(1500);
  });

  test("board preserves row title and order fields", async () => {
    await saveBoard(boardId, sampleBoard);
    const board = await getBoard(boardId);
    expect(board?.rows[0].title).toBe("Feature");
    expect(board?.rows[0].order).toBe("a0");
  });

  test("board preserves column title and order fields", async () => {
    await saveBoard(boardId, sampleBoard);
    const board = await getBoard(boardId);
    expect(board?.columns[1].title).toBe("Done");
    expect(board?.columns[1].order).toBe("a1");
  });

  test("board preserves task order field", async () => {
    await saveBoard(boardId, sampleBoard);
    const board = await getBoard(boardId);
    expect(board?.tasks[0].order).toBe("a0");
  });

  test("migrates a legacy single-entry board on first read", async () => {
    await memKv.set(["board", boardId], sampleBoard);
    expect(await getBoard(boardId)).toEqual(sampleBoard);
    expect((await memKv.get(["board", boardId])).value).toBeNull();
    expect((await memKv.get(["task", boardId, "task-a"])).value).toEqual(
      sampleBoard.tasks[0],
    );
    expect(await getBoard(boardId)).toEqual(sampleBoard);
  });

  test("a migration that lost a race keeps what was saved since", async () => {
    await memKv.set(["board", boardId], sampleBoard);
    const edited = { ...sampleBoard.tasks[0], title: "Saved after migrating" };
    // Between this read of the legacy entry and its migration commit, another
    // request migrates the board and the user saves an edit.
    const racingKv = new Proxy(memKv, {
      get(target, prop) {
        if (prop === "get") {
          return async (key: Deno.KvKey) => {
            const entry = await target.get(key);
            if (key[0] === "board") {
              _setKvForTest(memKv);
              await getBoard(boardId);
              await applyBoardChanges(boardId, {
                upserts: { ...noUpserts, tasks: [edited] },
                deletes: noDeletes,
              });
            }
            return entry;
          };
        }
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    _setKvForTest(racingKv);

    const board = await getBoard(boardId);

    expect(board?.tasks[0]).toEqual(edited);
    expect((await memKv.get(["task", boardId, "task-a"])).value).toEqual(
      edited,
    );
  });
});

// ── deleteBoard ───────────────────────────────────────────────────────────────

describe("deleteBoard", () => {
  test("removes every entity so getBoard returns null", async () => {
    await saveBoard(boardId, sampleBoard);
    await deleteBoard(boardId);
    expect(await getBoard(boardId)).toBeNull();
  });

  test("removes a legacy single-entry board", async () => {
    await memKv.set(["board", boardId], sampleBoard);
    await deleteBoard(boardId);
    expect(await getBoard(boardId)).toBeNull();
  });

  test("does not throw when deleting a board that does not exist", async () => {
    await expect(deleteBoard("never-existed")).resolves.not.toThrow();
  });

  test("does not affect other boards", async () => {
    const otherBoardId = "other-board";
    await saveBoard(boardId, sampleBoard);
    await saveBoard(otherBoardId, sampleBoard);
    await deleteBoard(boardId);
    expect(await getBoard(otherBoardId)).not.toBeNull();
  });
});

// ── user_board mapping ────────────────────────────────────────────────────────

describe("getBoardIdForUser / setBoardIdForUser", () => {
  test("returns null when no mapping has been set", async () => {
    expect(await getBoardIdForUser("user-xyz")).toBeNull();
  });

  test("returns the boardId after it has been set", async () => {
    await setBoardIdForUser("user-abc", boardId);
    expect(await getBoardIdForUser("user-abc")).toBe(boardId);
  });

  test("each userId maps to its own boardId independently", async () => {
    await setBoardIdForUser("user-1", "board-111");
    await setBoardIdForUser("user-2", "board-222");
    expect(await getBoardIdForUser("user-1")).toBe("board-111");
    expect(await getBoardIdForUser("user-2")).toBe("board-222");
  });

  test("overwrites an existing mapping on a second call", async () => {
    await setBoardIdForUser("user-abc", "old-board");
    await setBoardIdForUser("user-abc", "new-board");
    expect(await getBoardIdForUser("user-abc")).toBe("new-board");
  });
});

// ── purgeExpiredTrash ─────────────────────────────────────────────────────────

describe("purgeExpiredTrash", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-10-07T00:00:00.000Z");
  const daysAgo = (days: number) => new Date(now - days * DAY_MS).toISOString();

  const trashBoard = (): PersistedBoard => ({
    ...sampleBoard,
    columns: [
      ...sampleBoard.columns,
      {
        ...sampleBoard.columns[0],
        id: "trash",
        title: "Trash",
        order: "a2",
        isTrash: true,
      },
    ],
    tasks: [
      ...sampleBoard.tasks,
      {
        ...sampleBoard.tasks[1],
        id: "expired",
        colId: "trash",
        trashedAt: daysAgo(30),
        preTrashColId: "col-1",
      },
      {
        ...sampleBoard.tasks[1],
        id: "recent",
        colId: "trash",
        trashedAt: daysAgo(29),
        preTrashColId: "col-1",
      },
    ],
  });

  test("deletes only Trash tasks past retention, with their comments", async () => {
    await saveBoard(boardId, trashBoard());
    await saveBoard("untouched-board", sampleBoard);
    const comment = {
      id: "c1",
      taskId: "expired",
      authorId: null,
      authorName: "A",
      authorImageUrl: null,
      content: "",
      createdAt: daysAgo(31),
      updatedAt: null,
    };
    await saveTaskComment(boardId, comment);

    const result = await purgeExpiredTrash(now);

    expect(result).toEqual({
      boardsScanned: 2,
      boardsUpdated: 1,
      tasksDeleted: 1,
      commentsDeleted: 1,
      conflicts: 0,
    });
    const board = await getBoard(boardId);
    expect(board?.tasks.map((t) => t.id)).toEqual([
      "recent",
      "task-a",
      "task-b",
    ]);
    expect(await listTaskComments(boardId, "expired")).toEqual([]);
    expect(await getBoard("untouched-board")).toEqual(sampleBoard);
  });

  test("bumps the revision of each board it purges from, so a stale save is rejected", async () => {
    await saveBoard(boardId, trashBoard());
    await saveBoard("untouched-board", sampleBoard);
    const stale = await getBoardRevision(boardId);
    const untouched = await getBoardRevision("untouched-board");

    await purgeExpiredTrash(now);

    expect(await getBoardRevision(boardId)).not.toBe(stale);
    expect(await getBoardRevision("untouched-board")).toBe(untouched);
    // A tab that still holds the purged task can't save it back.
    const res = await applyBoardChanges(
      boardId,
      { upserts: { tasks: [trashBoard().tasks[2]] } },
      [revisionCheck(boardId, stale)],
    );
    expect(res.ok).toBe(false);
    expect((await getBoard(boardId))?.tasks.map((t) => t.id)).not.toContain(
      "expired",
    );
  });

  test("deletes comments whose task is no longer on the board, past a day old", async () => {
    await saveBoard(boardId, sampleBoard);
    const comment = (id: string, taskId: string, createdAt: string) => ({
      id,
      taskId,
      authorId: null,
      authorName: "A",
      authorImageUrl: null,
      content: "",
      createdAt,
      updatedAt: null,
    });
    // task-a is on the board; "removed" went with its row/column; "unsaved"
    // is a new task whose board autosave hasn't landed yet.
    await saveTaskComment(boardId, comment("c1", "task-a", daysAgo(5)));
    await saveTaskComment(boardId, comment("c2", "removed", daysAgo(2)));
    await saveTaskComment(boardId, comment("c3", "unsaved", daysAgo(0.5)));

    const result = await purgeExpiredTrash(now);

    expect(result.commentsDeleted).toBe(1);
    expect(result.boardsUpdated).toBe(0);
    expect(await listTaskComments(boardId, "task-a")).toHaveLength(1);
    expect(await listTaskComments(boardId, "removed")).toEqual([]);
    expect(await listTaskComments(boardId, "unsaved")).toHaveLength(1);
  });

  test("leaves boards saved before Trash existed alone", async () => {
    await saveBoard(boardId, sampleBoard);
    const result = await purgeExpiredTrash(now);
    expect(result.tasksDeleted).toBe(0);
    expect(await getBoard(boardId)).toEqual(sampleBoard);
  });

  test("migrates legacy single-entry boards, then purges them", async () => {
    await memKv.set(["board", boardId], trashBoard());
    const comment = (id: string, taskId: string) => ({
      id,
      taskId,
      authorId: null,
      authorName: "A",
      authorImageUrl: null,
      content: "",
      createdAt: daysAgo(31),
      updatedAt: null,
    });
    await saveTaskComment(boardId, comment("c1", "expired"));
    await saveTaskComment(boardId, comment("c2", "task-a"));

    const result = await purgeExpiredTrash(now);

    expect(result).toMatchObject({ tasksDeleted: 1, commentsDeleted: 1 });
    expect((await memKv.get(["board", boardId])).value).toBeNull();
    expect((await getBoard(boardId))?.tasks.map((t) => t.id)).toEqual([
      "recent",
      "task-a",
      "task-b",
    ]);
    expect(await listTaskComments(boardId, "expired")).toEqual([]);
    expect(await listTaskComments(boardId, "task-a")).toHaveLength(1);
  });
});

describe("getEntity / saveEntity", () => {
  test("saves when the entry is still at the version that was read", async () => {
    await applyBoardChanges(boardId, {
      upserts: sampleBoard,
      deletes: { rowIds: [], columnIds: [], taskIds: [] },
    });
    const read = await getEntity<{ id: string; title: string }>(
      "row",
      boardId,
      "row-1",
    );
    expect(read?.value.title).toBe("Feature");
    const version = await saveEntity(
      "row",
      boardId,
      { ...read!.value, title: "Renamed" },
      read!.versionstamp,
    );
    expect(version).not.toBeNull();
    expect((await getBoard(boardId))?.rows[0].title).toBe("Renamed");
  });

  test("rejects the save if the entry changed since it was read", async () => {
    await applyBoardChanges(boardId, {
      upserts: sampleBoard,
      deletes: { rowIds: [], columnIds: [], taskIds: [] },
    });
    const read = await getEntity<{ id: string }>("task", boardId, "task-a");
    await applyBoardChanges(boardId, {
      upserts: {
        rows: [],
        columns: [],
        tasks: [{ ...sampleBoard.tasks[0], title: "Edited on the web" }],
      },
      deletes: { rowIds: [], columnIds: [], taskIds: [] },
    });
    const version = await saveEntity(
      "task",
      boardId,
      { ...sampleBoard.tasks[0], title: "Edited in the CLI" },
      read!.versionstamp,
    );
    expect(version).toBeNull();
    const tasks = (await getBoard(boardId))?.tasks ?? [];
    expect(tasks.find((t) => t.id === "task-a")?.title).toBe(
      "Edited on the web",
    );
  });

  test("getEntity returns null for a missing entry", async () => {
    expect(await getEntity("task", boardId, "nope")).toBeNull();
  });
});

describe("board revision checks", () => {
  const renamed = (title: string) => ({
    upserts: { tasks: [{ ...sampleBoard.tasks[0], title }] },
  });

  test("getBoardRevision is null until the board is written", async () => {
    expect(await getBoardRevision(boardId)).toBeNull();
    const res = await saveBoard(boardId, sampleBoard);
    expect(res.ok && res.versionstamp).toBe(await getBoardRevision(boardId));
  });

  test("a save at the current revision commits and returns the new one", async () => {
    await saveBoard(boardId, sampleBoard);
    const rev = await getBoardRevision(boardId);
    const res = await applyBoardChanges(boardId, renamed("Next"), [
      revisionCheck(boardId, rev),
    ]);
    expect(res.ok).toBe(true);
    expect(res.ok && res.versionstamp).not.toBe(rev);
    expect(res.ok && res.versionstamp).toBe(await getBoardRevision(boardId));
    expect((await getBoard(boardId))?.tasks[0].title).toBe("Next");
  });

  test("a save at a stale revision is rejected and writes nothing", async () => {
    await saveBoard(boardId, sampleBoard);
    const stale = await getBoardRevision(boardId);
    await applyBoardChanges(boardId, { upserts: { rows: sampleBoard.rows } });
    const res = await applyBoardChanges(boardId, renamed("Stale"), [
      revisionCheck(boardId, stale),
    ]);
    expect(res.ok).toBe(false);
    expect((await getBoard(boardId))?.tasks[0].title).toBe("Write tests");
  });

  test("a null revision is rejected once the board has been written", async () => {
    await saveBoard(boardId, sampleBoard);
    const res = await applyBoardChanges(boardId, renamed("New"), [
      revisionCheck(boardId, null),
    ]);
    expect(res.ok).toBe(false);
  });

  test("saveEntity bumps the board revision", async () => {
    await saveBoard(boardId, sampleBoard);
    const rev = await getBoardRevision(boardId);
    const read = await getEntity<{ id: string }>("row", boardId, "row-1");
    const version = await saveEntity(
      "row",
      boardId,
      read!.value,
      read!.versionstamp,
    );
    expect(version).toBe(await getBoardRevision(boardId));
    expect(version).not.toBe(rev);
  });

  test("a split save stops if another write lands between its chunks", async () => {
    await saveBoard(boardId, sampleBoard);
    const rev = await getBoardRevision(boardId);
    const tasks = Array.from({ length: 1500 }, (_, i) => ({
      ...sampleBoard.tasks[1],
      id: `task-${String(i).padStart(4, "0")}`,
    }));
    // Lands right after the first chunk commits.
    const atomic = memKv.atomic.bind(memKv);
    let commits = 0;
    memKv.atomic = () => {
      const op = atomic();
      const commit = op.commit.bind(op);
      op.commit = async () => {
        const res = await commit();
        if (++commits === 1) await memKv.set(["board_rev", boardId], 0);
        return res;
      };
      return op;
    };
    const res = await applyBoardChanges(boardId, { upserts: { tasks } }, [
      revisionCheck(boardId, rev),
    ]);
    memKv.atomic = atomic;
    expect(res.ok).toBe(false);
    expect((await getBoard(boardId))?.tasks.length).toBe(2 + 999);
  });
});

describe("watchBoard", () => {
  // Emissions after the one watchBoard() sends on subscribe.
  async function watchRevisions(id: string) {
    const reader = (await watchBoard(id)).getReader();
    await reader.read();
    const next = async () => (await reader.read()).value![0].versionstamp;
    // Resolves "quiet" if nothing is emitted within `ms`.
    const nextOrQuiet = (ms = 100) =>
      Promise.race([
        next(),
        new Promise<"quiet">((resolve) => setTimeout(resolve, ms, "quiet")),
      ]);
    return { next, nextOrQuiet, stop: () => reader.cancel() };
  }

  test("emits after applyBoardChanges", async () => {
    const revisions = await watchRevisions(boardId);
    await saveBoard(boardId, sampleBoard);
    expect(await revisions.next()).not.toBeNull();
    await revisions.stop();
  });

  test("emits after saveEntity, but not after a rejected one", async () => {
    await saveBoard(boardId, sampleBoard);
    const read = await getEntity<{ id: string; title: string }>(
      "row",
      boardId,
      "row-1",
    );
    const revisions = await watchRevisions(boardId);
    await saveEntity(
      "row",
      boardId,
      { ...read!.value, title: "A" },
      read!.versionstamp,
    );
    expect(await revisions.next()).not.toBeNull();
    await saveEntity(
      "row",
      boardId,
      { ...read!.value, title: "B" },
      read!.versionstamp,
    );
    expect(await revisions.nextOrQuiet()).toBe("quiet");
    await revisions.stop();
  });

  test("emits a deleted entry after deleteBoard", async () => {
    await saveBoard(boardId, sampleBoard);
    const revisions = await watchRevisions(boardId);
    await deleteBoard(boardId);
    expect(await revisions.next()).toBeNull();
    await revisions.stop();
  });

  test("ignores writes to other boards", async () => {
    const revisions = await watchRevisions(boardId);
    await saveBoard("other-board", sampleBoard);
    expect(await revisions.nextOrQuiet()).toBe("quiet");
    await revisions.stop();
  });
});
