import type { Column, Task } from "./types.ts";

export const computeTasksByCell = (tasks: Task[]): Record<string, Task[]> => {
  const grouped: Record<string, Task[]> = {};
  for (const task of tasks) {
    const key = `${task.rowId}|${task.colId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(task);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.order < b.order ? -1 : 1);
  }
  return grouped;
};

export const findTodoColumnId = (columns: Column[]): string => {
  const todo = columns.find(
    (c) => c.title.toLowerCase().replace(/\s+/g, "") === "todo",
  );
  return todo?.id ?? columns[0]?.id ?? "";
};
