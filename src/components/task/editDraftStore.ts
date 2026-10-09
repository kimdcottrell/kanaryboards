import { useSyncExternalStore } from "react";
import type { Task } from "../context/types.ts";
import { hasLexicalText } from "@lib/lexical.ts";

// Unsaved edit-modal changes, kept per task when the modal is closed without
// saving and restored the next time it opens (see startEditTask).
export interface StoredEditDraft {
  draft: Task;
  updatedAt: number; // ms since epoch
}

const keyFor = (taskId: string) => `task+${taskId}`;

// Fired on write/clear so useHasEditDraft subscribers re-check their task.
const CHANGE_EVENT = "edit-draft-change";
const notify = () => globalThis.dispatchEvent(new Event(CHANGE_EVENT));

function subscribe(onChange: () => void) {
  globalThis.addEventListener(CHANGE_EVENT, onChange);
  return () => globalThis.removeEventListener(CHANGE_EVENT, onChange);
}

export function useHasEditDraft(taskId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readEditDraft(taskId) !== null,
    () => false,
  );
}

export function readEditDraft(taskId: string): StoredEditDraft | null {
  try {
    const stored = localStorage.getItem(keyFor(taskId));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function writeEditDraft(draft: Task): void {
  try {
    localStorage.setItem(
      keyFor(draft.id),
      JSON.stringify({ draft, updatedAt: Date.now() }),
    );
  } catch {
    // storage unavailable or full; the changes are just not kept
  }
  notify();
}

export function clearEditDraft(taskId: string): void {
  try {
    localStorage.removeItem(keyFor(taskId));
  } catch {
    // storage unavailable
  }
  notify();
}

// The fields saveEdit persists, normalized the same way (empty checklist
// items are dropped), so a draft can be compared with the saved task. An
// empty editor serializes to an empty-paragraph document, not "".
export function editableFields(task: Task) {
  return JSON.stringify({
    title: task.title.trim(),
    description: hasLexicalText(task.description) ? task.description : "",
    rowId: task.rowId,
    colId: task.colId,
    checklist: task.checklist
      .filter((i) => i.text.trim())
      .map(({ id, text, checked }) => ({ id, text, checked })),
  });
}
