import { useContext, useMemo } from "react";
import {
  BoardDispatchContext,
  BoardRefsContext,
  BoardStateContext,
} from "./BoardContext.tsx";
import { useAsyncActions } from "./useAsyncActions.ts";
import { computeTasksByCell } from "./selectors.ts";
import { createId, STORAGE_KEY } from "./constants.ts";
import { generateKeyBetween } from "fractional-indexing";
import type { ChecklistItem, Column, Row, Task, TaskDraft } from "./types.ts";

export function useBoard() {
  const state = useContext(BoardStateContext);
  const dispatch = useContext(BoardDispatchContext);
  const refs = useContext(BoardRefsContext);

  if (!state || !dispatch || !refs) {
    throw new Error("useBoard must be used within a BoardProvider");
  }

  const { setChecklistInputRef, focusChecklistInput } = refs;
  const async_ = useAsyncActions(state, dispatch, focusChecklistInput);
  const tasksByCell = useMemo(
    () => computeTasksByCell(state.tasks),
    [state.tasks],
  );

  return {
    // ── State ──────────────────────────────────────────────────────────────
    ...state,
    tasksByCell,

    // ── Raw setters (components call these directly) ────────────────────
    setNewRowName: (name: string) =>
      dispatch({ type: "ROW/SET_NEW_NAME", payload: { name } }),
    setNewRowPrompt: (prompt: string) =>
      dispatch({ type: "ROW/SET_NEW_PROMPT", payload: { prompt } }),
    setDefaultColumnInput: (value: string) =>
      dispatch({ type: "COLUMN/SET_INPUT", payload: { value } }),
    setDraggedDefaultIndex: (index: number | null) =>
      dispatch({ type: "COLUMN/SET_DRAGGED_INDEX", payload: { index } }),
    setTaskDraft: (draft: TaskDraft) =>
      dispatch({ type: "TASK/UPDATE_DRAFT", payload: { draft } }),
    setEditTaskDraft: (draft: Task | null) => {
      if (draft) {
        dispatch({ type: "TASK/UPDATE_EDIT_DRAFT", payload: { draft } });
      } else dispatch({ type: "TASK/CLOSE_EDIT_MODAL" });
    },
    // null cancels the edit; a string value updates the in-progress name
    setEditingRowName: (name: string | null) => {
      if (name === null) dispatch({ type: "ROW/EDIT_CANCEL" });
      else dispatch({ type: "ROW/EDIT_CHANGE", payload: { name } });
    },
    setEditingColumnName: (name: string | null) => {
      if (name === null) dispatch({ type: "COLUMN/RENAME_CANCEL" });
      else dispatch({ type: "COLUMN/RENAME_CHANGE", payload: { name } });
    },
    setChecklistPrompt: (prompt: string) =>
      dispatch({ type: "CHECKLIST_AI/SET_PROMPT", payload: { prompt } }),
    setChecklistInputRef,

    // ── Column handlers ─────────────────────────────────────────────────
    addColumn: (title: string) => {
      const lastCol = state.columns[state.columns.length - 1];
      dispatch({
        type: "COLUMN/ADD",
        payload: {
          id: createId(),
          title,
          order: generateKeyBetween(lastCol?.order ?? null, null),
        },
      });
    },
    reorderColumn: (columnId: string, beforeColumnId: string | null) =>
      dispatch({
        type: "COLUMN/REORDER",
        payload: { columnId, beforeColumnId },
      }),
    deleteColumn: (columnId: string) =>
      dispatch({ type: "COLUMN/DELETE", payload: { columnId } }),
    handleDefaultColumnInputKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const title = state.defaultColumnInput.trim();
        if (title) {
          const lastCol = state.columns[state.columns.length - 1];
          dispatch({
            type: "COLUMN/ADD",
            payload: {
              id: createId(),
              title,
              order: generateKeyBetween(lastCol?.order ?? null, null),
            },
          });
          dispatch({ type: "COLUMN/SET_INPUT", payload: { value: "" } });
        }
      }
    },
    handleDefaultColumnDragStart: (index: number) => (event: DragEvent) => {
      dispatch({ type: "DRAG/SET_DEFAULT_INDEX", payload: { index } });
      event.dataTransfer!.effectAllowed = "move";
      event.dataTransfer!.setData("text/plain", String(index));
    },
    handleDefaultColumnDragOver: (event: DragEvent) => {
      event.preventDefault();
    },
    handleDefaultColumnDrop: (targetColumnId: string) => (event: DragEvent) => {
      event.preventDefault();
      const fromIndex = state.draggedDefaultIndex !== null
        ? state.draggedDefaultIndex
        : Number(event.dataTransfer?.getData("text/plain"));
      if (!Number.isNaN(fromIndex) && state.columns[fromIndex]) {
        const draggedId = state.columns[fromIndex].id;
        if (draggedId !== targetColumnId) {
          dispatch({
            type: "COLUMN/REORDER",
            payload: { columnId: draggedId, beforeColumnId: targetColumnId },
          });
        }
      }
      dispatch({ type: "DRAG/SET_DEFAULT_INDEX", payload: { index: null } });
    },

    // ── Row handlers ────────────────────────────────────────────────────
    moveRow: (fromIndex: number, toIndex: number) =>
      dispatch({ type: "ROW/MOVE", payload: { fromIndex, toIndex } }),
    moveRowUp: (index: number) =>
      dispatch({
        type: "ROW/MOVE",
        payload: { fromIndex: index, toIndex: index - 1 },
      }),
    moveRowDown: (index: number) =>
      dispatch({
        type: "ROW/MOVE",
        payload: { fromIndex: index, toIndex: index + 1 },
      }),
    deleteRow: (rowId: string) =>
      dispatch({ type: "ROW/DELETE", payload: { rowId } }),
    updateRowColor: (rowId: string, color: string) =>
      dispatch({ type: "ROW/UPDATE_COLOR", payload: { rowId, color } }),
    editRowTitle: (row: Row) =>
      dispatch({
        type: "ROW/EDIT_START",
        payload: { rowId: row.id, currentName: row.title },
      }),
    saveRowTitle: (rowId: string) =>
      dispatch({ type: "ROW/EDIT_SAVE", payload: { rowId } }),
    renameRow: (rowId: string, name: string) =>
      dispatch({ type: "ROW/RENAME", payload: { rowId, name } }),
    editColumnTitle: (column: Column, row: Row) =>
      dispatch({
        type: "COLUMN/RENAME_START",
        payload: {
          columnId: column.id,
          rowId: row.id,
          currentName: column.title,
        },
      }),
    saveColumnTitle: (columnId: string) =>
      dispatch({ type: "COLUMN/RENAME_SAVE", payload: { columnId } }),
    addRow: async_.addRow,

    // ── Task handlers ────────────────────────────────────────────────────
    openTaskForm: (rowId: string, colId: string) =>
      dispatch({ type: "TASK/OPEN_CREATE_MODAL", payload: { rowId, colId } }),
    closeTaskCreateModal: () => dispatch({ type: "TASK/CLOSE_CREATE_MODAL" }),
    createTask: (
      event: Event,
      content?: { json: string; markdown: string; html: string },
    ) => {
      event.preventDefault();
      if (!(event.target as HTMLFormElement).checkValidity()) return;
      const { rowId, colId } = state.taskDraft;
      const cellKey = `${rowId}|${colId}`;
      const cellTasks = tasksByCell[cellKey] ?? [];
      const firstOrder = cellTasks[0]?.order ?? null;
      const task: Task = {
        id: createId(),
        rowId,
        colId,
        order: generateKeyBetween(null, firstOrder),
        title: state.taskDraft.title.trim(),
        description: content?.json ?? state.taskDraft.description,
        checklist: state.taskDraft.checklist.filter(
          (item: ChecklistItem) => item.text.trim(),
        ),
      };
      dispatch({ type: "TASK/CREATE", payload: { task } });
    },
    startEditTask: (task: Task) =>
      dispatch({ type: "TASK/OPEN_EDIT_MODAL", payload: { task } }),
    cancelEditTask: () => dispatch({ type: "TASK/CLOSE_EDIT_MODAL" }),
    deleteTask: (taskId: string) =>
      dispatch({ type: "TASK/DELETE", payload: { taskId } }),
    saveTaskEdit: (
      event: Event,
      content?: { json: string; markdown: string; html: string },
    ) => {
      event.preventDefault();
      if (!(event.target as HTMLFormElement).checkValidity()) return;
      if (content !== undefined && state.editTaskDraft) {
        dispatch({
          type: "TASK/UPDATE_EDIT_DRAFT",
          payload: {
            draft: { ...state.editTaskDraft, description: content.json },
          },
        });
      }
      dispatch({ type: "TASK/SAVE_EDIT" });
    },
    toggleTaskChecklist: (taskId: string, itemId: string) =>
      dispatch({
        type: "TASK/TOGGLE_CHECKLIST_ITEM",
        payload: { taskId, itemId },
      }),
    moveTaskToColumn: (taskId: string, colId: string) =>
      dispatch({ type: "TASK/MOVE_TO_COLUMN", payload: { taskId, colId } }),
    handleDragEnd: () => dispatch({ type: "DRAG/END_TASK" }),
    handleTaskDragStart: (task: Task) => (event: DragEvent) => {
      dispatch({
        type: "DRAG/START_TASK",
        payload: { taskId: task.id, rowId: task.rowId, colId: task.colId },
      });
      event.dataTransfer!.effectAllowed = "move";
    },
    reorderTaskInCell: (taskId: string, beforeTaskId: string | null) =>
      dispatch({
        type: "TASK/REORDER_IN_CELL",
        payload: { taskId, beforeTaskId },
      }),
    handleColumnDrop: (rowId: string, colId: string) => (event: DragEvent) => {
      event.preventDefault();
      dispatch({
        type: "DRAG/DROP_TASK",
        payload: { toRowId: rowId, toColId: colId },
      });
    },

    // ── Checklist item handlers ──────────────────────────────────────────
    addChecklistItem: async_.addChecklistItem,
    addEditChecklistItem: async_.addEditChecklistItem,
    updateChecklistItem: (
      id: string,
      field: string,
      value: string | boolean,
    ) =>
      dispatch({
        type: "CHECKLIST/UPDATE_ITEM",
        payload: {
          target: "draft",
          itemId: id,
          field: field as "text" | "checked",
          value,
        },
      }),
    updateEditChecklistItem: (
      id: string,
      field: string,
      value: string | boolean,
    ) =>
      dispatch({
        type: "CHECKLIST/UPDATE_ITEM",
        payload: {
          target: "editDraft",
          itemId: id,
          field: field as "text" | "checked",
          value,
        },
      }),
    deleteChecklistItem: (id: string) =>
      dispatch({
        type: "CHECKLIST/DELETE_ITEM",
        payload: { target: "draft", itemId: id },
      }),
    deleteEditChecklistItem: (id: string) =>
      dispatch({
        type: "CHECKLIST/DELETE_ITEM",
        payload: { target: "editDraft", itemId: id },
      }),
    handleChecklistKeyDown: (
      event: KeyboardEvent,
      index: number,
      addItemFn: (focusNew: boolean, insertBeforeIndex?: number) => void,
    ) => {
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        addItemFn(true, index);
      } else if (event.key === "Enter") {
        event.preventDefault();
        (event.target as HTMLElement).blur();
      }
    },
    generateChecklistItems: async_.generateChecklistItems,
    applyChecklistPreview: () =>
      dispatch({ type: "CHECKLIST_AI/APPLY_TO_EDIT_DRAFT" }),
    applyChecklistPreviewToDraft: () =>
      dispatch({ type: "CHECKLIST_AI/APPLY_TO_CREATE_DRAFT" }),
    clearChecklistPreview: () => dispatch({ type: "CHECKLIST_AI/RESET" }),

    // ── AI handlers ──────────────────────────────────────────────────────
    generateTasksForRow: async_.generateTasksForRow,

    // ── Board handlers ───────────────────────────────────────────────────
    resetBoard: () => {
      dispatch({ type: "BOARD/RESET" });
      globalThis.localStorage?.removeItem(STORAGE_KEY);
      fetch("/api/board", { method: "DELETE" });
    },
    confirmResetBoard: async_.confirmResetBoard,
  };
}
