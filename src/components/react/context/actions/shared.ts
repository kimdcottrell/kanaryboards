import { createId } from "../constants.ts";
import { findTodoColumnId } from "../selectors.ts";
import { generateNKeysBetween } from "fractional-indexing";
import type { Column, Row, Task } from "@lib/types.ts";

export const buildTasksFromTitles = (
  titles: string[],
  rowId: string,
  columns: Column[],
): Task[] => {
  const todoColId = findTodoColumnId(columns);
  const orders = generateNKeysBetween(null, null, titles.length);
  return titles.map((title, i) => ({
    id: createId(),
    rowId,
    colId: todoColId,
    order: orders[i],
    title,
    description: "",
    checklist: [],
    trashedAt: null,
    preTrashColId: null,
  }));
};

export const fetchGeneratedItems = async (
  prompt: string,
  maxItems = 10,
): Promise<string[]> => {
  const response = await fetch("/api/v1/ai/task-titles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTasks: maxItems }),
  });
  if (!response.ok) {
    let message = "AI generation failed";
    try {
      const data = await response.json();
      message = data?.error ?? message;
    } catch { /* ignore parse failure */ }
    throw new Error(message);
  }
  const data = await response.json();
  return Array.isArray(data.response)
    ? data.response.map((item: unknown) => String(item).trim())
    : [];
};

// A task's rowId as the form shows it: "" (no project picked) once its row
// has been deleted, e.g. in another tab (BOARD/SYNC), so the save is
// rejected with "Project is required." instead of keeping a dangling id.
export const liveRowId = (rows: Row[], rowId: string) =>
  rows.some((r) => r.id === rowId) ? rowId : "";

// A rejected field: `field` names the input to show `error` under (absent when
// the check couldn't run at all).
export type FieldError = { field?: string; error: string };

// Runs the board's field checks (src/lib/api/fields.ts) on `values` via
// POST /api/v1/validate/{entity}, the same checks the kanby CLI gets. Resolves
// to the normalized values to save, or the error to show. If the check can't
// be reached the save is blocked rather than skipped.
export async function validateEntity<T extends Record<string, unknown>>(
  entity: "task" | "row" | "column",
  values: T,
): Promise<{ ok: true; values: T } | ({ ok: false } & FieldError)> {
  try {
    const response = await fetch(`/api/v1/validate/${entity}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    if (response.ok) return { ok: true, values: { ...values, ...data.values } };
    if (response.status === 422) {
      return { ok: false, field: data.field, error: data.error };
    }
  } catch { /* fall through */ }
  return { ok: false, error: "Couldn't check this — try again." };
}

export function handleChecklistKeyDown(
  event: KeyboardEvent,
  index: number,
  addItemFn: (focusNew: boolean, insertBeforeIndex?: number) => void,
) {
  if (event.key === "Enter" && event.shiftKey) {
    event.preventDefault();
    addItemFn(true, index + 1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    (event.target as HTMLElement).blur();
  }
}
