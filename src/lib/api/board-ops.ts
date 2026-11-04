import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { PersistedBoard } from "@lib/db/kv.ts";
import type {
  ChecklistItem,
  Row,
  Task,
} from "@components/react/context/types.ts";
import {
  createId,
  rowColorOptions,
} from "@components/react/context/constants.ts";
import { byOrder, insertKey } from "@components/react/context/ordering.ts";
import {
  expiredTrashTaskIds,
  normalizeColumn,
  normalizeTask,
  reset,
} from "@components/react/context/reducers/board.ts";
import { lexicalToPlainText, plainTextToLexical } from "@lib/lexical.ts";
import { shortId } from "@lib/dashboard/short-id.ts";

// Server-side counterparts of the board's client-side domain rules, for the
// kanby CLI API (src/pages/api/v1/{rows,tasks,columns}). They work on a
// PersistedBoard from getBoard() and return the entities to save.

// The board as the web app shows it after BOARD/LOAD: legacy fields
// backfilled, rows/columns sorted, expired Trash tasks and tasks whose row or
// column is gone dropped. load() itself isn't reused because it also appends
// a Trash column that isn't saved until the web app's next autosave.
export function liveBoard(board: PersistedBoard): PersistedBoard {
  const columns = board.columns.map(normalizeColumn).sort((a, b) =>
    a.isTrash !== b.isTrash ? (a.isTrash ? 1 : -1) : byOrder(a, b)
  );
  const rows = [...board.rows].sort(byOrder);
  const rowIds = new Set(rows.map((r) => r.id));
  const colIds = new Set(columns.map((c) => c.id));
  const expired = expiredTrashTaskIds(columns, board.tasks, Date.now());
  const tasks = board.tasks.map(normalizeTask).filter((t) =>
    !expired.has(t.id) && rowIds.has(t.rowId) && colIds.has(t.colId)
  ).sort(byOrder);
  return { rows, columns, tasks };
}

// The default board (To Do / In Progress / Review / Done + Trash) that the
// web app creates on BOARD/RESET, for a user whose first action is the CLI.
export const defaultColumns = () => reset().columns;

export { shortId };

const MIN_REF_LENGTH = 6;

// Finds the item whose id is `ref`, or ends with it (the CLI shows the last 8
// characters, since a UUIDv7's leading characters are a timestamp).
export function findByRef<T extends { id: string }>(
  items: T[],
  ref: string,
): T | { status: 404 | 409; error: string } {
  const exact = items.find((item) => item.id === ref);
  if (exact) return exact;
  if (ref.length < MIN_REF_LENGTH) {
    return {
      status: 404,
      error: `Use at least ${MIN_REF_LENGTH} characters of the id.`,
    };
  }
  const matches = items.filter((item) => item.id.endsWith(ref));
  if (matches.length === 0) return { status: 404, error: "Not found." };
  if (matches.length > 1) {
    return { status: 409, error: "That id matches more than one item." };
  }
  return matches[0];
}

// Fractional orders for AI-generated checklist text, after the last existing
// item (as reducers/checklistAi.ts does).
export function appendChecklistItems(
  existing: ChecklistItem[],
  texts: string[],
): ChecklistItem[] {
  const lastOrder = existing[existing.length - 1]?.order ?? null;
  const orders = generateNKeysBetween(lastOrder, null, texts.length);
  return [
    ...existing,
    ...texts.map((text, i) => ({
      id: createId(),
      text,
      checked: false,
      order: orders[i],
    })),
  ];
}

const cellTasks = (board: PersistedBoard, rowId: string, colId: string) =>
  board.tasks.filter((t) => t.rowId === rowId && t.colId === colId);

export interface TaskInput {
  rowId: string;
  colId: string;
  title: string;
  description: string; // plain text
  checklist: string[]; // new items' text
}

// New tasks go to the top of their cell, as in actions/taskCreate.ts.
export function newTask(board: PersistedBoard, input: TaskInput): Task {
  const first = cellTasks(board, input.rowId, input.colId).sort(byOrder)[0];
  return {
    id: createId(),
    rowId: input.rowId,
    colId: input.colId,
    order: generateKeyBetween(null, first?.order ?? null),
    title: input.title,
    description: plainTextToLexical(input.description),
    checklist: appendChecklistItems([], input.checklist),
    trashedAt: null,
    preTrashColId: null,
  };
}

// A task moved to another cell goes to the end of it. description is only
// rewritten when given, since the plain-text round trip drops formatting.
export function updatedTask(
  board: PersistedBoard,
  task: Task,
  changes: Partial<TaskInput>,
): Task {
  const rowId = changes.rowId ?? task.rowId;
  const colId = changes.colId ?? task.colId;
  const moved = rowId !== task.rowId || colId !== task.colId;
  return {
    ...task,
    rowId,
    colId,
    order: moved ? insertKey(cellTasks(board, rowId, colId)) : task.order,
    title: changes.title ?? task.title,
    description: changes.description === undefined
      ? task.description
      : plainTextToLexical(changes.description),
    checklist: changes.checklist
      ? appendChecklistItems(task.checklist, changes.checklist)
      : task.checklist,
  };
}

// New rows are appended, as in actions/rowForm.ts.
export function newRow(
  board: PersistedBoard,
  input: { title: string; color?: string },
): Row {
  const last = board.rows[board.rows.length - 1];
  return {
    id: createId(),
    title: input.title,
    color: input.color ?? rowColorOptions[0].value,
    order: generateKeyBetween(last?.order ?? null, null),
  };
}

export const colorLabel = (value: string) =>
  rowColorOptions.find((o) => o.value === value)?.label ?? value;

// What the CLI is sent for a task: ids shortened, titles resolved, and the
// description as plain text.
export function taskView(board: PersistedBoard, task: Task) {
  return {
    id: task.id,
    shortId: shortId(task.id),
    title: task.title,
    description: lexicalToPlainText(task.description),
    rowId: task.rowId,
    rowTitle: board.rows.find((r) => r.id === task.rowId)?.title ?? "",
    colId: task.colId,
    colTitle: board.columns.find((c) => c.id === task.colId)?.title ?? "",
    checklist: [...task.checklist].sort(byOrder),
    trashed: task.trashedAt !== null,
  };
}

export function rowView(board: PersistedBoard, row: Row) {
  return {
    id: row.id,
    shortId: shortId(row.id),
    title: row.title,
    color: colorLabel(row.color),
    taskCount:
      board.tasks.filter((t) => t.rowId === row.id && t.trashedAt === null)
        .length,
  };
}
