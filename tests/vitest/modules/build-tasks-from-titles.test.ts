import { describe, expect, test } from "vitest";
import { buildTasksFromTitles } from "@components/context/actions/shared.ts";
import type { Column } from "@components/context/types.ts";

const col = (id: string, title: string, order: string): Column => ({
  id,
  title,
  order,
  pinnedToShortcut: false,
  pinnedToDock: false,
  icon: null,
  iconInBoardMenu: false,
  iconNearColumnTitle: false,
});

const columns = [
  col("c-todo", "To Do", "a0"),
  col("c-doing", "In Progress", "a1"),
  col("c-done", "Done", "a2"),
];

const titles = ["First task", "Second task", "Third task"];

describe("buildTasksFromTitles", () => {
  test("returns one task per title, preserving order of titles", () => {
    const tasks = buildTasksFromTitles(titles, "row-1", columns);
    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.title)).toEqual(titles);
  });

  test("sets rowId and empty description/checklist on each task", () => {
    const tasks = buildTasksFromTitles(titles, "row-1", columns);
    for (const task of tasks) {
      expect(task.rowId).toBe("row-1");
      expect(task.description).toBe("");
      expect(task.checklist).toEqual([]);
    }
  });

  test("places tasks in the To Do column (case/space-insensitive)", () => {
    const tasks = buildTasksFromTitles(titles, "row-1", columns);
    expect(tasks.every((t) => t.colId === "c-todo")).toBe(true);
  });

  test("falls back to the first column when there is no To Do column", () => {
    const noTodo = [col("c-a", "Backlog", "a0"), col("c-b", "Shipped", "a1")];
    const tasks = buildTasksFromTitles(titles, "row-1", noTodo);
    expect(tasks.every((t) => t.colId === "c-a")).toBe(true);
  });

  test("assigns strictly ascending, unique orders and unique ids", () => {
    const tasks = buildTasksFromTitles(titles, "row-1", columns);
    const orders = tasks.map((t) => t.order);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i - 1] < orders[i]).toBe(true);
    }
    expect(new Set(orders).size).toBe(orders.length);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
  });

  test("returns an empty array for no titles", () => {
    expect(buildTasksFromTitles([], "row-1", columns)).toEqual([]);
  });
});
