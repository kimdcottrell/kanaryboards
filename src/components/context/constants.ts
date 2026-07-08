import type { Task } from "./types.ts";
import { createId } from "@lib/uuid.ts";
import { generateKeyBetween } from "fractional-indexing";

export { createId };

export const STORAGE_KEY = "kanby-v0-1-0";

export const rowColorOptions = [
  { label: "Blue", value: "var(--color-row-blue)" },
  { label: "Red", value: "var(--color-row-red)" },
  { label: "Yellow", value: "var(--color-row-yellow)" },
  { label: "Green", value: "var(--color-row-green)" },
  { label: "Purple", value: "var(--color-row-purple)" },
  { label: "Grey", value: "var(--color-row-grey)" },
];

export const emptyTaskDraft = (rowId: string, colId: string): Task => ({
  id: "",
  order: "",
  title: "",
  description: "",
  checklist: [{
    id: createId(),
    text: "",
    checked: false,
    order: generateKeyBetween(null, null),
  }],
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
