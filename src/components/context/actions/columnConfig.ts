import { useCallback, useMemo } from "react";
import {
  useBoardDataState,
  useBoardDispatch,
  useColumnConfigState,
} from "../BoardContext.tsx";
import { createId } from "../constants.ts";
import { generateKeyBetween } from "fractional-indexing";
import { DragEvent, KeyboardEvent } from "react";

export function useColumnConfigActions() {
  const dispatch = useBoardDispatch();
  const { defaultColumnInput, draggedDefaultIndex } = useColumnConfigState();
  const { columns } = useBoardDataState();

  const addColumn = useCallback((title: string) => {
    const lastCol = columns[columns.length - 1];
    dispatch({
      type: "COLUMN/ADD",
      payload: {
        id: createId(),
        title,
        order: generateKeyBetween(lastCol?.order ?? null, null),
      },
    });
  }, [columns, dispatch]);

  const handleDefaultColumnInputKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const title = defaultColumnInput.trim();
        if (title) {
          const lastCol = columns[columns.length - 1];
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
    [defaultColumnInput, columns, dispatch],
  );

  const handleDefaultColumnDrop = useCallback(
    (targetColumnId: string) => (event: DragEvent) => {
      event.preventDefault();
      const fromIndex = draggedDefaultIndex !== null
        ? draggedDefaultIndex
        : Number(event.dataTransfer?.getData("text/plain"));
      if (!Number.isNaN(fromIndex) && columns[fromIndex]) {
        const draggedId = columns[fromIndex].id;
        if (draggedId !== targetColumnId) {
          dispatch({
            type: "COLUMN/REORDER",
            payload: { columnId: draggedId, beforeColumnId: targetColumnId },
          });
        }
      }
      dispatch({ type: "COLUMN/SET_DRAGGED_INDEX", payload: { index: null } });
    },
    [draggedDefaultIndex, columns, dispatch],
  );

  const dispatchOnly = useMemo(() => ({
    setDefaultColumnInput: (value: string) =>
      dispatch({ type: "COLUMN/SET_INPUT", payload: { value } }),
    setDraggedDefaultIndex: (index: number | null) =>
      dispatch({ type: "COLUMN/SET_DRAGGED_INDEX", payload: { index } }),
    reorderColumn: (columnId: string, beforeColumnId: string | null) =>
      dispatch({
        type: "COLUMN/REORDER",
        payload: { columnId, beforeColumnId },
      }),
    deleteColumn: (columnId: string) =>
      dispatch({ type: "COLUMN/DELETE", payload: { columnId } }),
    handleDefaultColumnDragStart: (index: number) => (event: DragEvent) => {
      dispatch({ type: "COLUMN/SET_DRAGGED_INDEX", payload: { index } });
      event.dataTransfer!.effectAllowed = "move";
      event.dataTransfer!.setData("text/plain", String(index));
    },
    handleDefaultColumnDragOver: (event: DragEvent) => {
      event.preventDefault();
    },
  }), [dispatch]);

  return {
    ...dispatchOnly,
    addColumn,
    handleDefaultColumnInputKeyDown,
    handleDefaultColumnDrop,
  };
}
