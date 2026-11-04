import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  BoardProvider,
  useBoardDataState,
  useBoardDispatch,
} from "@components/react/context/BoardContext.tsx";
import type { Row } from "@components/react/context/types.ts";
import type { BoardChanges } from "@lib/db/kv.ts";
import type { FakeEventSource } from "../eventSource.setup.ts";

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

describe("BoardProvider (signed in) — live refresh", () => {
  const trash = { ...column, id: "trash", order: "a1", isTrash: true };
  const cliRow = { id: "row-cli", title: "From CLI", color: "", order: "a1" };

  // A board the server holds. PATCHes are applied to it, as /api/v1/board does.
  function stubServer(
    board: { rows: unknown[]; columns: unknown[]; tasks: unknown[] },
  ) {
    const server = { board, patches: [] as BoardChanges[] };
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: Init) => {
        if (init?.method === "PATCH") {
          const changes: BoardChanges = JSON.parse(init.body!);
          server.patches.push(changes);
          const upsert = <T extends { id: string }>(
            items: T[],
            next: T[],
          ) => [
            ...items.filter((i) => !next.some((n) => n.id === i.id)),
            ...next,
          ];
          server.board = {
            rows: upsert(server.board.rows as Row[], changes.upserts.rows),
            columns: server.board.columns,
            tasks: server.board.tasks,
          };
          return Promise.resolve(new Response("{}"));
        }
        return Promise.resolve(new Response(JSON.stringify(server.board)));
      }),
    );
    return server;
  }

  function Probe() {
    const { rows } = useBoardDataState();
    const dispatch = useBoardDispatch();
    return (
      <>
        <span data-testid="rows">{rows.map((r) => r.title).join(",")}</span>
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: "ROW/RENAME",
              payload: { rowId: "row-1", name: "Local" },
            })}
        >
          rename
        </button>
      </>
    );
  }

  const renderProbe = () =>
    render(
      <BoardProvider boardId="board-1" isAuthenticated>
        <Probe />
      </BoardProvider>,
    );

  const events = () =>
    (globalThis.EventSource as unknown as typeof FakeEventSource).instances
      .at(-1)!;
  const rowTitles = () => screen.getByTestId("rows").textContent;

  test("applies a board changed elsewhere without saving it back", async () => {
    const server = stubServer({
      rows: [row],
      columns: [column, trash],
      tasks: [],
    });
    renderProbe();
    await waitFor(() => expect(rowTitles()).toBe("Project"));
    expect(events().url).toBe("/api/v1/board/events");

    server.board = { ...server.board, rows: [row, cliRow] };
    events().emit();

    await waitFor(() => expect(rowTitles()).toBe("Project,From CLI"));
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(server.patches).toEqual([]);
  });

  test("waits for a pending local edit to be saved before refreshing", async () => {
    const server = stubServer({
      rows: [row],
      columns: [column, trash],
      tasks: [],
    });
    renderProbe();
    await waitFor(() => expect(rowTitles()).toBe("Project"));

    fireEvent.click(screen.getByRole("button", { name: "rename" }));
    server.board = { ...server.board, rows: [row, cliRow] };
    events().emit();

    await waitFor(() => expect(rowTitles()).toBe("Local,From CLI"), {
      timeout: 3000,
    });
    expect(server.patches).toHaveLength(1);
    expect(server.patches[0].upserts.rows).toEqual([
      { ...row, title: "Local" },
    ]);
  });

  test("closes the stream on unmount", async () => {
    stubServer({ rows: [row], columns: [column, trash], tasks: [] });
    const { unmount } = renderProbe();
    await waitFor(() => expect(rowTitles()).toBe("Project"));
    unmount();
    expect(events().closed).toBe(true);
  });
});
