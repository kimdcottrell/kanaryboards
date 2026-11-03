import { useMemo } from "react";
import { useBoardDispatch, useBoardMeta } from "../BoardContext.tsx";
import { deleteAllComments } from "../../task/comments/commentStore.ts";
import { clearEditDraft, readEditDraft } from "../../task/editDraftStore.ts";
import type { Task } from "../types.ts";
import type { DragEvent } from "react";

export function useTaskActions() {
  const dispatch = useBoardDispatch();
  const { boardId, isAuthenticated } = useBoardMeta();

  return useMemo(() => ({
    openTaskForm: (rowId: string, colId: string) =>
      dispatch({ type: "TASK/OPEN_CREATE_MODAL", payload: { rowId, colId } }),
    closeTaskCreateModal: () => dispatch({ type: "TASK/CLOSE_CREATE_MODAL" }),
    startEditTask: (task: Task) => {
      // Reapply changes left unsaved when the modal was last closed.
      const stored = readEditDraft(task.id)?.draft;
      dispatch({
        type: "TASK/OPEN_EDIT_MODAL",
        payload: {
          task: stored
            ? {
              ...task,
              title: stored.title,
              description: stored.description,
              rowId: stored.rowId,
              colId: stored.colId,
              checklist: stored.checklist,
            }
            : task,
        },
      });
    },
    cancelEditTask: () => dispatch({ type: "TASK/CLOSE_EDIT_MODAL" }),
    deleteTask: (taskId: string) => {
      dispatch({ type: "TASK/DELETE", payload: { taskId } });
      clearEditDraft(taskId);
      // Comments are stored outside the board, so they need their own cleanup.
      deleteAllComments({ boardId, isAuthenticated }, taskId).catch((error) =>
        console.error({
          event: "Failed to delete task comments",
          taskId,
          error,
        })
      );
    },
    trashTask: (taskId: string) => {
      dispatch({ type: "TASK/TRASH", payload: { taskId } });
      clearEditDraft(taskId);
    },
    restoreTask: (taskId: string) =>
      dispatch({ type: "TASK/RESTORE", payload: { taskId } }),
    toggleTaskChecklist: (taskId: string, itemId: string) =>
      dispatch({
        type: "TASK/TOGGLE_CHECKLIST_ITEM",
        payload: { taskId, itemId },
      }),
    moveTaskToColumn: (taskId: string, colId: string) =>
      dispatch({ type: "TASK/MOVE_TO_COLUMN", payload: { taskId, colId } }),
    reorderTaskInCell: (taskId: string, beforeTaskId: string | null) =>
      dispatch({
        type: "TASK/REORDER_IN_CELL",
        payload: { taskId, beforeTaskId },
      }),
    handleTaskDragEnd: () => dispatch({ type: "TASK/END_DRAG" }),
    handleTaskDragStart: (task: Task) => (event: DragEvent) => {
      dispatch({ type: "TASK/START_DRAG", payload: { task } });
      event.dataTransfer!.effectAllowed = "move";
    },
    handleColumnDrop:
      (rowId: string, colId: string, beforeTaskId: string | null) =>
      (event: DragEvent) => {
        event.preventDefault();
        dispatch({
          type: "TASK/DROP_ON_CELL",
          payload: { toRowId: rowId, toColId: colId, beforeTaskId },
        });
      },
  }), [dispatch, boardId, isAuthenticated]);
}
