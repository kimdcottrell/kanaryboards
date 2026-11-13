// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  appendChecklistItems,
  defaultColumns,
  findByRef,
  liveBoard,
  newRow,
  newTask,
  updatedTask,
} from "@lib/api/board-ops.ts";
import type { Column, PersistedBoard, Task } from "@lib/types.ts";
import { lexicalToPlainText, plainTextToLexical } from "@lib/lexical.ts";

const column = (id: string, order: string, isTrash = false): Column => ({
  id,
  title: id,
  order,
  pinnedToShortcut: false,
  pinnedToDock: false,
  icon: null,
  iconInBoardMenu: false,
  iconNearColumnTitle: false,
  isTrash,
});

const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  rowId: "row-1",
  colId: "col-1",
  title: id,
  description: "",
  checklist: [],
  order: "a0",
  trashedAt: null,
  preTrashColId: null,
  ...overrides,
});

const board = (): PersistedBoard => ({
  rows: [{ id: "row-1", title: "Row", color: "c", order: "a0" }],
  columns: [
    column("trash", "a9", true),
    column("col-1", "a0"),
    column("col-2", "a1"),
  ],
  tasks: [
    task("task-a", { order: "a0" }),
    task("task-b", { order: "a1" }),
    task("task-c", { colId: "col-2", order: "a0" }),
  ],
});

describe("liveBoard", () => {
  test("drops orphan and expired Trash tasks, sorts Trash last", () => {
    const live = liveBoard({
      ...board(),
      tasks: [
        task("ok"),
        task("orphan-row", { rowId: "gone" }),
        task("orphan-col", { colId: "gone" }),
        task("expired", { colId: "trash", trashedAt: "2000-01-01T00:00:00Z" }),
      ],
    });
    expect(live.tasks.map((t) => t.id)).toEqual(["ok"]);
    expect(live.columns.map((c) => c.id)).toEqual(["col-1", "col-2", "trash"]);
  });
});

describe("newTask / updatedTask", () => {
  test("a new task goes to the top of its cell", () => {
    const created = newTask(board(), {
      rowId: "row-1",
      colId: "col-1",
      title: "New",
      description: "",
      checklist: ["one", "two"],
    });
    expect(created.order < "a0").toBe(true);
    expect(created.checklist.map((i) => i.text)).toEqual(["one", "two"]);
    expect(created.checklist[0].order < created.checklist[1].order).toBe(true);
    expect(created.description).toBe("");
  });

  test("a task moved to another cell goes to the end of it", () => {
    const b = board();
    const moved = updatedTask(b, b.tasks[0], { colId: "col-2" });
    expect(moved.colId).toBe("col-2");
    expect(moved.order > "a0").toBe(true);
  });

  test("an unchanged cell keeps its order and description", () => {
    const b = board();
    const original = { ...b.tasks[0], description: '{"root":{}}' };
    const edited = updatedTask(b, original, { title: "Renamed" });
    expect(edited).toEqual({ ...original, title: "Renamed" });
  });

  test("checked marks the listed items done and the others not", () => {
    const b = board();
    const items = appendChecklistItems([], ["one", "two"]).map((i, n) => ({
      ...i,
      checked: n === 0,
    }));
    const original = { ...b.tasks[0], checklist: items };
    const edited = updatedTask(b, original, {
      checked: [items[1].id, "unknown"],
      checklist: ["three"],
    });
    expect(edited.checklist.map((i) => [i.text, i.checked])).toEqual([
      ["one", false],
      ["two", true],
      ["three", false],
    ]);
    expect(updatedTask(b, original, { title: "x" }).checklist).toBe(items);
  });

  test("items on create sets the whole checklist with its checked state", () => {
    const created = newTask(board(), {
      rowId: "row-1",
      colId: "col-1",
      title: "New",
      description: "",
      checklist: ["ai"],
      items: [{ text: "one", checked: true }, { text: "two", checked: false }],
    });
    expect(created.checklist.map((i) => [i.text, i.checked])).toEqual([
      ["one", true],
      ["two", false],
      ["ai", false],
    ]);
  });

  test("items replaces the checklist: keeps, renames-as-new, removes, reorders", () => {
    const b = board();
    const existing = appendChecklistItems([], ["one", "two", "three"]);
    const original = { ...b.tasks[0], checklist: existing };
    const edited = updatedTask(b, original, {
      items: [
        { id: existing[2].id, text: "three", checked: true },
        { id: existing[0].id, text: "one", checked: false },
        { id: "unknown", text: "new", checked: true },
      ],
    });
    expect(edited.checklist.map((i) => [i.text, i.checked])).toEqual([
      ["three", true],
      ["one", false],
      ["new", true],
    ]);
    expect(edited.checklist[0].id).toBe(existing[2].id);
    expect(edited.checklist[1].id).toBe(existing[0].id);
    expect(existing.some((e) => e.id === edited.checklist[2].id)).toBe(false);
    expect(edited.checklist[0].order < edited.checklist[1].order).toBe(true);
    expect(edited.checklist[1].order < edited.checklist[2].order).toBe(true);
    expect(updatedTask(b, original, { items: [] }).checklist).toEqual([]);
  });

  test("checklist items are appended after existing ones", () => {
    const existing = appendChecklistItems([], ["first"]);
    const items = appendChecklistItems(existing, ["second"]);
    expect(items.map((i) => i.text)).toEqual(["first", "second"]);
    expect(items[0].order < items[1].order).toBe(true);
  });
});

describe("newRow / defaultColumns", () => {
  test("a new row is appended with the default color", () => {
    const row = newRow(board(), { title: "Next" });
    expect(row.order > "a0").toBe(true);
    expect(row.color).toBe("var(--color-row-blue)");
  });

  test("default columns match the web app's fresh board", () => {
    expect(defaultColumns().map((c) => [c.title, c.isTrash])).toEqual([
      ["To Do", false],
      ["In Progress", false],
      ["Review", false],
      ["Done", false],
      ["Trash", true],
    ]);
  });
});

describe("findByRef", () => {
  const items = [{ id: "0190aaaa-1111-7000-8000-00000000abcd" }, {
    id: "0190aaaa-2222-7000-8000-10000000abcd",
  }];

  test("matches a full id or a unique suffix", () => {
    expect(findByRef(items, items[1].id)).toBe(items[1]);
    expect(findByRef(items, "10000000abcd")).toBe(items[1]);
  });

  test("rejects ambiguous, unknown, and too-short refs", () => {
    expect(findByRef(items, "0abcd")).toMatchObject({ status: 404 });
    expect(findByRef(items, "00abcd")).toMatchObject({ status: 409 });
    expect(findByRef(items, "ffffff")).toMatchObject({ status: 404 });
  });
});

describe("plain text <-> Lexical", () => {
  test("round-trips lines, including blank ones", () => {
    const text = "First line\n\nThird line";
    expect(lexicalToPlainText(plainTextToLexical(text))).toBe(text);
  });

  test("empty text stays empty", () => {
    expect(plainTextToLexical("  ")).toBe("");
    expect(lexicalToPlainText("")).toBe("");
  });

  test("reads text out of nested formatting", () => {
    const json = JSON.stringify({
      root: {
        children: [{
          type: "heading",
          children: [{ text: "Bold " }, { children: [{ text: "link" }] }],
        }],
      },
    });
    expect(lexicalToPlainText(json)).toBe("Bold link");
  });
});
