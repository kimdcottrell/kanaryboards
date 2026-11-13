import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  BoardProvider,
  useBoardDataState,
  useBoardDispatch,
  useTaskEditState,
} from "@components/react/context/BoardContext.tsx";
import {
  readEditDraft,
  writeEditDraft,
} from "@components/react/task/editDraftStore.ts";
import type { Row } from "@lib/types.ts";
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

// Deno's own BroadcastChannel delivers each autosave's broadcast to the
// providers of other tests in this worker, and its events aren't jsdom's, so
// the first one crashes the worker (as with EventSource, see
// eventSource.setup.ts). Cross-tab sync is covered by Playwright.
beforeEach(() => {
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage = null;
      postMessage() {}
      close() {}
    },
  );
});

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

  describe("with a task modal open", () => {
    const task = (id: string, title: string) => ({
      ...legacyTask(id),
      title,
      trashedAt: null,
      preTrashColId: null,
    });

    function EditProbe() {
      const { tasks } = useBoardDataState();
      const { taskEditModalOpen, editTaskDraft } = useTaskEditState();
      const dispatch = useBoardDispatch();
      return (
        <>
          <span data-testid="tasks">{tasks.map((t) => t.title).join(",")}</span>
          <span data-testid="draft">
            {taskEditModalOpen ? editTaskDraft?.title : "closed"}
          </span>
          <button
            type="button"
            onClick={() => {
              dispatch({
                type: "TASK/OPEN_EDIT_MODAL",
                payload: { task: tasks[0] },
              });
              dispatch({
                type: "TASK/UPDATE_EDIT_DRAFT",
                payload: { draft: { ...tasks[0], title: "Unsaved" } },
              });
              writeEditDraft({ ...tasks[0], title: "Stashed" });
            }}
          >
            edit
          </button>
        </>
      );
    }

    async function openModal() {
      const server = stubServer({
        rows: [row],
        columns: [column, trash],
        tasks: [task("task-1", "Task 1"), task("task-2", "Task 2")],
      });
      render(
        <BoardProvider boardId="board-1" isAuthenticated>
          <EditProbe />
        </BoardProvider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId("tasks").textContent).toBe("Task 1,Task 2")
      );
      fireEvent.click(screen.getByRole("button", { name: "edit" }));
      expect(screen.getByTestId("draft").textContent).toBe("Unsaved");
      return server;
    }

    beforeEach(() => localStorage.clear());

    test("closes it and discards its edits when its task is saved elsewhere", async () => {
      const server = await openModal();

      server.board = {
        ...server.board,
        tasks: [task("task-1", "From CLI"), task("task-2", "Task 2")],
      };
      events().emit();

      await waitFor(() =>
        expect(screen.getByTestId("tasks").textContent).toBe(
          "From CLI,Task 2",
        )
      );
      expect(screen.getByTestId("draft").textContent).toBe("closed");
      expect(readEditDraft("task-1")).toBeNull();
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("This task was changed elsewhere.");

      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(screen.queryByRole("alert")).toBeNull();
      await new Promise((resolve) => setTimeout(resolve, 700));
      expect(server.patches).toEqual([]);
    });

    test("keeps it open when another task is saved elsewhere", async () => {
      const server = await openModal();

      server.board = {
        ...server.board,
        tasks: [task("task-1", "Task 1"), task("task-2", "From CLI")],
      };
      events().emit();

      await waitFor(() =>
        expect(screen.getByTestId("tasks").textContent).toBe(
          "Task 1,From CLI",
        )
      );
      expect(screen.getByTestId("draft").textContent).toBe("Unsaved");
      expect(readEditDraft("task-1")?.draft.title).toBe("Stashed");
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  test("closes the stream on unmount", async () => {
    stubServer({ rows: [row], columns: [column, trash], tasks: [] });
    const { unmount } = renderProbe();
    await waitFor(() => expect(rowTitles()).toBe("Project"));
    unmount();
    expect(events().closed).toBe(true);
  });
});

describe("BoardProvider (signed in) — save conflicts", () => {
  const trash = { ...column, id: "trash", order: "a1", isTrash: true };
  const cliRow = { id: "row-cli", title: "From CLI", color: "", order: "a1" };

  // A board the server holds, with a revision that every write advances.
  // A PATCH whose If-Match isn't the current revision gets a 409.
  function stubServer(board: { rows: Row[]; columns: unknown[]; tasks: [] }) {
    const server = {
      board,
      rev: 1,
      // Each PATCH's If-Match and status.
      patches: [] as { ifMatch: string | undefined; status: number }[],
      // A write made elsewhere (another device, the CLI).
      writeElsewhere(rows: Row[]) {
        server.board = { ...server.board, rows };
        server.rev++;
      },
    };
    const etag = () => ({ ETag: `"r${server.rev}"` });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: Init & { headers?: Record<string, string> }) => {
          if (init?.method === "PATCH") {
            const ifMatch = init.headers?.["If-Match"];
            if (ifMatch && ifMatch !== etag().ETag) {
              server.patches.push({ ifMatch, status: 409 });
              return Promise.resolve(
                Response.json({ conflict: true }, { status: 409 }),
              );
            }
            const changes: BoardChanges = JSON.parse(init.body!);
            const ids = new Set(changes.upserts.rows.map((r) => r.id));
            server.board = {
              ...server.board,
              rows: [
                ...server.board.rows.filter((r) => !ids.has(r.id)),
                ...changes.upserts.rows,
              ],
            };
            server.rev++;
            server.patches.push({ ifMatch, status: 200 });
            return Promise.resolve(
              Response.json({ ok: true }, { headers: etag() }),
            );
          }
          return Promise.resolve(
            Response.json(server.board, { headers: etag() }),
          );
        },
      ),
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
  const rowTitles = () => screen.getByTestId("rows").textContent;
  const events = () =>
    (globalThis.EventSource as unknown as typeof FakeEventSource).instances
      .at(-1)!;

  test("a 409 is merged and resent when nothing collided", async () => {
    const server = stubServer({
      rows: [row],
      columns: [column, trash],
      tasks: [],
    });
    renderProbe();
    await waitFor(() => expect(rowTitles()).toBe("Project"));

    server.writeElsewhere([row, cliRow]); // no SSE event yet
    fireEvent.click(screen.getByRole("button", { name: "rename" }));

    await waitFor(() => expect(server.patches.at(-1)?.status).toBe(200), {
      timeout: 3000,
    });
    expect(server.patches).toEqual([
      { ifMatch: '"r1"', status: 409 },
      { ifMatch: '"r2"', status: 200 },
    ]);
    expect(rowTitles()).toBe("Local,From CLI");
    expect(server.board.rows.map((r) => r.title)).toEqual([
      "From CLI",
      "Local",
    ]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("an entity changed on both sides takes the server's version, with a notice", async () => {
    const server = stubServer({
      rows: [row],
      columns: [column, trash],
      tasks: [],
    });
    renderProbe();
    await waitFor(() => expect(rowTitles()).toBe("Project"));

    server.writeElsewhere([{ ...row, title: "Remote" }]);
    fireEvent.click(screen.getByRole("button", { name: "rename" }));

    const alert = await screen.findByRole("alert", {}, { timeout: 3000 });
    expect(alert.textContent).toContain("Some of your changes were replaced.");
    expect(rowTitles()).toBe("Remote");
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(server.patches).toEqual([{ ifMatch: '"r1"', status: 409 }]);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("a live refresh advances the revision even when the board is unchanged", async () => {
    const server = stubServer({
      rows: [row],
      columns: [column, trash],
      tasks: [],
    });
    renderProbe();
    await waitFor(() => expect(rowTitles()).toBe("Project"));

    server.writeElsewhere([row]); // a write that leaves the board as it was
    events().emit();
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.filter(([, i]) => !i?.method))
        .toHaveLength(2)
    );
    fireEvent.click(screen.getByRole("button", { name: "rename" }));

    await waitFor(() => expect(server.patches).toHaveLength(1), {
      timeout: 3000,
    });
    expect(server.patches).toEqual([{ ifMatch: '"r2"', status: 200 }]);
  });
});
