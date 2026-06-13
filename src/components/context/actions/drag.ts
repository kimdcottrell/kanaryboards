import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";
import type { Task } from "../types.ts";
import type { DragEvent } from "react";

export function useDragActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
    handleDragEnd: () => dispatch({ type: "DRAG/END_TASK" }),
    handleTaskDragStart: (task: Task) => (event: DragEvent) => {
      dispatch({ type: "DRAG/START_TASK", payload: { task } });
      event.dataTransfer!.effectAllowed = "move";
    },
    handleColumnDrop: (rowId: string, colId: string) => (event: DragEvent) => {
      event.preventDefault();
      dispatch({
        type: "DRAG/DROP_TASK",
        payload: { toRowId: rowId, toColId: colId },
      });
    },
  }), [dispatch]);
}
