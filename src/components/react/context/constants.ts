import type { Task } from "./types.ts";
import { createId } from "@lib/db/uuid.ts";
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
  trashedAt: null,
  preTrashColId: null,
});

// Tasks in the Trash column are permanently deleted this long after
// `trashedAt`, by /api/purge-trash (KV boards) and on board load (all boards).
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isTrashExpired = (trashedAt: string | null, now: number) =>
  trashedAt !== null &&
  now - Date.parse(trashedAt) >= TRASH_RETENTION_DAYS * DAY_MS;

export const daysUntilPurge = (trashedAt: string | null, now: number) =>
  trashedAt === null ? TRASH_RETENTION_DAYS : Math.max(
    0,
    Math.ceil(TRASH_RETENTION_DAYS - (now - Date.parse(trashedAt)) / DAY_MS),
  );

export const loadPersistedState = () => {
  if (typeof globalThis.localStorage === "undefined") return null;
  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};
