import type { Column, Task } from "./types.ts";

export const computeTasksByCell = (tasks: Task[]): Record<string, Task[]> => {
  const grouped: Record<string, Task[]> = {};
  for (const task of tasks) {
    const key = `${task.rowId}|${task.colId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(task);
  }
  return grouped;
};

export const findTodoColumnId = (columns: Column[]): string => {
  const todo = columns.find((c) => c.name.toLowerCase().trim() === "todo");
  return todo?.id ?? columns[0]?.id ?? "";
};
