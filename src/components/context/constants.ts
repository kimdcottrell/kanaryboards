import type { TaskDraft } from "./types.ts";

export const STORAGE_KEY = "kanary-boards";
export const TASK_META_STORAGE_KEY = "kanary-task-meta";

export const createId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });

export const initialDefaultColumnNames = ["To Do", "In Progress", "Done"];

export const rowColorOptions = [
  { label: "Blue", value: "var(--color-row-blue)" },
  { label: "Red", value: "var(--color-row-red)" },
  { label: "Yellow", value: "var(--color-row-yellow)" },
  { label: "Green", value: "var(--color-row-green)" },
  { label: "Purple", value: "var(--color-row-purple)" },
  { label: "Grey", value: "var(--color-row-grey)" },
];

export const emptyTaskDraft = (rowId: string, colId: string): TaskDraft => ({
  title: "",
  description: "",
  checklist: [{ id: createId(), text: "", checked: false }],
  rowId,
  colId,
});

export const createDefaultBoard = () => ({
  rows: [{
    id: createId(),
    name: "Sample Project",
    color: "var(--color-row-blue)",
  }],
  columns: initialDefaultColumnNames.map((name) => ({ id: createId(), name })),
  tasks: [] as import("./types.ts").Task[],
  defaultColumnNames: initialDefaultColumnNames,
});

export const loadPersistedState = () => {
  if (typeof globalThis.localStorage === "undefined") return null;
  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};
