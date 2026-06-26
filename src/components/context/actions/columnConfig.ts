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
  const { defaultColumnInput, defaultColumnIcon, draggedDefaultIndex } =
    useColumnConfigState();
  const { columns } = useBoardDataState();

  const addColumn = useCallback((title: string) => {
    const lastCol = columns[columns.length - 1];
    dispatch({
      type: "COLUMN/ADD",
      payload: {
        id: createId(),
        title,
        order: generateKeyBetween(lastCol?.order ?? null, null),
        icon: defaultColumnIcon,
      },
    });
  }, [columns, defaultColumnIcon, dispatch]);

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
              icon: defaultColumnIcon,
            },
          });
          dispatch({ type: "COLUMN/SET_INPUT", payload: { value: "" } });
          dispatch({ type: "COLUMN/SET_ICON", payload: { icon: null } });
        }
      }
    },
    [defaultColumnInput, defaultColumnIcon, columns, dispatch],
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
    togglePinColumn: (columnId: string) =>
      dispatch({ type: "COLUMN/TOGGLE_PIN", payload: { columnId } }),
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
    handleDefaultColumnInputKeyDown,
    handleDefaultColumnDrop,
  };
}
