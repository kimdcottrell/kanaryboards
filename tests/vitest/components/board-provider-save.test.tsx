import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BoardProvider } from "@components/context/BoardContext.tsx";

const row = { id: "row-1", title: "Project", color: "", order: "a0" };
const column = {
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
// Saved before the Trash column and trashedAt existed, so BOARD/LOAD's
// backfill gives the first autosave something to send.
const legacyTask = (id: string) => ({
  id,
  rowId: "row-1",
  colId: "col-1",
  order: "a0",
  title: id,
  description: "",
  checklist: [],
});

type Init = { method?: string; body?: string };

function stubFetch(board: unknown, patchStatus: number) {
  const fetchMock = vi.fn((_url: string, init?: Init) => {
    if (init?.method === "PATCH") {
      return Promise.resolve(
        new Response("{}", { status: patchStatus }),
      );
    }
    return Promise.resolve(new Response(JSON.stringify(board)));
  });
  vi.stubGlobal("fetch", fetchMock);
  const patches = () =>
    fetchMock.mock.calls
      .filter(([, init]) => init?.method === "PATCH")
      .map(([, init]) => JSON.parse(init!.body!));
  return patches;
}

const renderSignedIn = () =>
  render(
    <BoardProvider boardId="board-1" isAuthenticated>
      <span />
    </BoardProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BoardProvider (signed in) — autosave", () => {
  test("sends only what changed since the load", async () => {
    const patches = stubFetch(
      { rows: [row], columns: [column], tasks: [] },
      200,
    );
    renderSignedIn();

    await waitFor(() => expect(patches()).toHaveLength(1), { timeout: 3000 });
    const [patch] = patches();
    expect(patch.upserts.rows).toEqual([]);
    expect(patch.upserts.tasks).toEqual([]);
    expect(patch.upserts.columns).toEqual([
      expect.objectContaining({ title: "Trash", isTrash: true }),
    ]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("splits more than 1000 changes across PATCHes", async () => {
    const tasks = Array.from(
      { length: 1500 },
      (_, i) => legacyTask(`task-${i}`),
    );
    const patches = stubFetch({ rows: [row], columns: [column], tasks }, 200);
    renderSignedIn();

    await waitFor(() => expect(patches()).toHaveLength(2), { timeout: 3000 });
    const sizes = patches().map((p) =>
      p.upserts.rows.length + p.upserts.columns.length + p.upserts.tasks.length
    );
    expect(sizes).toEqual([1000, 501]);
  });

  test("shows a dismissible alert when the server rejects the save", async () => {
    const patches = stubFetch(
      { rows: [row], columns: [column], tasks: [] },
      400,
    );
    renderSignedIn();

    const alert = await screen.findByRole("alert", {}, { timeout: 3000 });
    expect(alert.textContent).toContain("Your changes could not be saved.");
    expect(patches()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
