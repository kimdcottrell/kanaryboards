import type {
  BoardLifecycleAction,
  BoardState,
  Column,
  StoredColumn,
  StoredTask,
  Task,
} from "../types.ts";
import { createId, emptyTaskDraft, isTrashExpired } from "../constants.ts";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export const createInitialState = (): BoardState => {
  return {
    rows: [],
    columns: [],
    tasks: [],
    boardLoaded: false,
    newRowName: "",
    newRowPrompt: "",
    newRowFormKey: 0,
    createRowModalOpen: false,
    editingRowId: null,
    editingRowName: "",
    editingColumnId: null,
    editingColumnRowId: null,
    editingColumnName: "",
    taskCreateModalOpen: false,
    taskDraft: emptyTaskDraft("", ""),
    taskEditModalOpen: false,
    editingTaskId: null,
    editTaskDraft: null,
    checklistModalTaskId: null,
    checklistPrompt: "",
    checklistPreview: [],
    isGeneratingChecklist: false,
    checklistModalError: "",
    isGeneratingTasks: false,
    taskGenerationStatus: "",
    defaultColumnInput: "",
    defaultColumnIcon: null,
    draggedDefaultIndex: null,
    draggedTask: null,
    boardConfigModalOpen: false,
    boardConfigScrollTarget: null,
    selectedColumnIds: [],
  };
};

export function openConfigModal(
  state: BoardState,
  payload?: { scrollTarget?: string },
): BoardState {
  return {
    ...state,
    boardConfigModalOpen: true,
    boardConfigScrollTarget: payload?.scrollTarget ?? null,
  };
}

export function closeConfigModal(state: BoardState): BoardState {
  return {
    ...state,
    boardConfigModalOpen: false,
    boardConfigScrollTarget: null,
  };
}

// Boards saved before the column pin/icon fields existed (6abb264, 2026-07-07)
// are missing them, and /api/board's validator rejects the whole board on the
// next PUT. Backfill them as off/none.
export const normalizeColumn = (column: StoredColumn): Column => ({
  ...column,
  pinnedToShortcut: column.pinnedToShortcut ?? false,
  pinnedToDock: column.pinnedToDock ?? false,
  icon: column.icon ?? null,
  iconInBoardMenu: column.iconInBoardMenu ?? false,
  iconNearColumnTitle: column.iconNearColumnTitle ?? false,
  isTrash: column.isTrash ?? false,
});

// Same backfill for tasks saved before the Trash column existed.
export const normalizeTask = (task: StoredTask): Task => ({
  ...task,
  trashedAt: task.trashedAt ?? null,
  preTrashColId: task.preTrashColId ?? null,
});

const createTrashColumn = (order: string): Column => ({
  id: createId(),
  title: "Trash",
  order,
  pinnedToShortcut: false,
  pinnedToDock: false,
  icon: null,
  iconInBoardMenu: false,
  iconNearColumnTitle: false,
  isTrash: true,
});

// Ids of Trash tasks past retention. Shared by load() (which drops them) and
// BoardProvider (which deletes their localStorage comments). Takes raw stored
// data, so legacy columns/tasks missing isTrash/trashedAt are tolerated.
export function expiredTrashTaskIds(
  columns: Pick<Partial<Column>, "id" | "isTrash">[],
  tasks: Pick<Partial<Task>, "id" | "colId" | "trashedAt">[],
  now: number,
): Set<string> {
  const trashIds = new Set(columns.filter((c) => c.isTrash).map((c) => c.id));
  return new Set(
    tasks
      .filter((t) =>
        trashIds.has(t.colId) && isTrashExpired(t.trashedAt ?? null, now)
      )
      .map((t) => t.id!),
  );
}

export function load(
  state: BoardState,
  payload: Extract<BoardLifecycleAction, { type: "BOARD/LOAD" }>["payload"],
): BoardState {
  const { rows, tasks } = payload;
  // Trash always sorts last, and boards saved before it existed get one.
  const columns = payload.columns.map(normalizeColumn).sort((a, b) =>
    a.isTrash !== b.isTrash ? (a.isTrash ? 1 : -1) : a.order < b.order ? -1 : 1
  );
  if (!columns.some((c) => c.isTrash)) {
    const last = columns[columns.length - 1];
    columns.push(
      createTrashColumn(generateKeyBetween(last?.order ?? null, null)),
    );
  }
  const expired = expiredTrashTaskIds(columns, tasks, Date.now());
  return {
    ...state,
    rows: [...rows].sort((a, b) => a.order < b.order ? -1 : 1),
    columns,
    // Expired Trash tasks are dropped here too: localStorage boards never
    // reach /api/purge-trash, and a stale tab may have re-saved purged tasks.
    tasks: tasks.map(normalizeTask).filter((t) => !expired.has(t.id)),
    boardLoaded: true,
  };
}

export function reset(): BoardState {
  const columnOrders = generateNKeysBetween(null, null, 5);
  return {
    ...createInitialState(),
    columns: [
      ...["To Do", "In Progress", "Review", "Done"].map((title, i) => ({
        id: createId(),
        title,
        order: columnOrders[i],
        pinnedToShortcut: title === "In Progress" || title === "Review",
        pinnedToDock: title === "In Progress",
        icon: null,
        iconInBoardMenu: title === "In Progress" || title === "Review",
        iconNearColumnTitle: false,
        isTrash: false,
      })),
      createTrashColumn(columnOrders[4]),
    ],
    rows: [],
    tasks: [],
    boardLoaded: true,
  };
}
