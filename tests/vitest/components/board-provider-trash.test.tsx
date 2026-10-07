import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { BoardProvider } from "@components/context/BoardContext.tsx";
import { useBoardDataState } from "@components/context/hooks.ts";
import { STORAGE_KEY } from "@components/context/constants.ts";
import { COMMENTS_STORAGE_KEY } from "@components/task/comments/commentStore.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString();

const column = (id: string, order: string, isTrash = false) => ({
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

const task = (id: string, colId: string, trashedAt: string | null) => ({
  id,
  rowId: "row-1",
  colId,
  order: "a0",
  title: id,
  description: "",
  checklist: [],
  trashedAt,
  preTrashColId: trashedAt ? "col-1" : null,
});

const comment = (taskId: string) => [{
  id: `c-${taskId}`,
  taskId,
  authorId: null,
  authorName: "A",
  authorImageUrl: null,
  content: "",
  createdAt: daysAgo(40),
  updatedAt: null,
}];

let loadedTaskIds: string[] = [];
function Probe() {
  const { tasks, boardLoaded } = useBoardDataState();
  if (boardLoaded) loadedTaskIds = tasks.map((t) => t.id);
  return null;
}

afterEach(() => {
  localStorage.clear();
  loadedTaskIds = [];
});

describe("BoardProvider (signed out) — expired Trash tasks", () => {
  test("drops expired Trash tasks and deletes their localStorage comments", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rows: [{ id: "row-1", title: "A", color: "#000", order: "a0" }],
        columns: [column("col-1", "a0"), column("trash", "a1", true)],
        tasks: [
          task("active", "col-1", null),
          task("recent", "trash", daysAgo(29)),
          task("expired", "trash", daysAgo(30)),
        ],
      }),
    );
    localStorage.setItem(
      COMMENTS_STORAGE_KEY,
      JSON.stringify({
        active: comment("active"),
        recent: comment("recent"),
        expired: comment("expired"),
      }),
    );

    render(
      <BoardProvider boardId="local-board" isAuthenticated={false}>
        <Probe />
      </BoardProvider>,
    );

    await waitFor(() => expect(loadedTaskIds).toEqual(["active", "recent"]));
    const comments = JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY)!);
    expect(Object.keys(comments).sort()).toEqual(["active", "recent"]);
  });
});
