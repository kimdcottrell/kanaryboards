import { useCallback, useMemo } from "react";
import {
  useBoardDataState,
  useBoardDispatch,
  useColumnConfigState,
} from "../BoardContext.tsx";
import { createId } from "../constants.ts";
import { generateKeyBetween } from "fractional-indexing";
import { DragEvent } from "react";

export function useColumnConfigActions() {
  const dispatch = useBoardDispatch();
  const { defaultColumnInput, draggedDefaultIndex } = useColumnConfigState();
  const { columns } = useBoardDataState();

  const addColumn = useCallback(
    (direction: "left" | "right", referenceColumnId: string) => {
      const title = defaultColumnInput.trim();
      const refIdx = columns.findIndex((c) => c.id === referenceColumnId);
      if (!title || !direction || refIdx === -1) return;

      const id = createId();
      const lastCol = columns[columns.length - 1];
      dispatch({
        type: "COLUMN/ADD",
        payload: {
          id,
          title,
          order: generateKeyBetween(lastCol?.order ?? null, null),
          icon: null,
        },
      });

      const beforeColumnId = direction === "left"
        ? referenceColumnId
        : columns[refIdx + 1]?.id ?? null;
      dispatch({
        type: "COLUMN/REORDER",
        payload: { columnId: id, beforeColumnId },
      });
      dispatch({ type: "COLUMN/SET_INPUT", payload: { value: "" } });
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
          const targetIndex = columns.findIndex((c) => c.id === targetColumnId);
          const beforeColumnId = fromIndex < targetIndex
            ? columns[targetIndex + 1]?.id ?? null
            : targetColumnId;
          dispatch({
            type: "COLUMN/REORDER",
            payload: { columnId: draggedId, beforeColumnId },
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
    setDefaultColumnIcon: (icon: string | null) =>
      dispatch({ type: "COLUMN/SET_ICON", payload: { icon } }),
    setColumnIcon: (columnId: string, icon: string | null) =>
      dispatch({ type: "COLUMN/SET_COLUMN_ICON", payload: { columnId, icon } }),
    setDraggedDefaultIndex: (index: number | null) =>
      dispatch({ type: "COLUMN/SET_DRAGGED_INDEX", payload: { index } }),
    reorderColumn: (columnId: string, beforeColumnId: string | null) =>
      dispatch({
        type: "COLUMN/REORDER",
        payload: { columnId, beforeColumnId },
      }),
    deleteColumn: (columnId: string) =>
      dispatch({ type: "COLUMN/DELETE", payload: { columnId } }),
    togglePinShortcut: (columnId: string) =>
      dispatch({ type: "COLUMN/TOGGLE_PIN_SHORTCUT", payload: { columnId } }),
    togglePinDock: (columnId: string) =>
      dispatch({ type: "COLUMN/TOGGLE_PIN_DOCK", payload: { columnId } }),
    toggleIconInBoardMenu: (columnId: string) =>
      dispatch({
        type: "COLUMN/TOGGLE_ICON_IN_BOARD_MENU",
        payload: { columnId },
      }),
    toggleIconNearColumnTitle: (columnId: string) =>
      dispatch({
        type: "COLUMN/TOGGLE_ICON_NEAR_COLUMN_TITLE",
        payload: { columnId },
      }),
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
    handleDefaultColumnDrop,
  };
}
