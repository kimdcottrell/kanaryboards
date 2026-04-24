import type { TaskDraft } from "./types.ts";

export const STORAGE_KEY = "claudekan-board-state";

export const createId = () =>
  `${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;

export const initialDefaultColumnNames = ["todo", "working on it", "done"];

export const rowColorOptions = [
  { label: "Blue", value: "#38bdf8" },
  { label: "Green", value: "#34d399" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#fb7185" },
  { label: "Violet", value: "#a855f7" },
  { label: "base", value: "#64748b" },
];

export const emptyTaskDraft = (rowId: string, colId: string): TaskDraft => ({
  title: "",
  description: "",
  checklist: [{ id: createId(), text: "", checked: false }],
  rowId,
  colId,
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
