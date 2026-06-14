import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";
import type { Task } from "../types.ts";
import type { DragEvent } from "react";

export function useTaskActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
    openTaskForm: (rowId: string, colId: string) =>
      dispatch({ type: "TASK/OPEN_CREATE_MODAL", payload: { rowId, colId } }),
    closeTaskCreateModal: () => dispatch({ type: "TASK/CLOSE_CREATE_MODAL" }),
    startEditTask: (task: Task) =>
      dispatch({ type: "TASK/OPEN_EDIT_MODAL", payload: { task } }),
    cancelEditTask: () => dispatch({ type: "TASK/CLOSE_EDIT_MODAL" }),
    deleteTask: (taskId: string) =>
      dispatch({ type: "TASK/DELETE", payload: { taskId } }),
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
    handleColumnDrop: (rowId: string, colId: string) => (event: DragEvent) => {
      event.preventDefault();
      dispatch({
        type: "TASK/DROP_ON_CELL",
        payload: { toRowId: rowId, toColId: colId },
      });
    },
  }), [dispatch]);
}
