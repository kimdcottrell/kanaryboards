import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";
import type { Column, Row } from "../types.ts";

export function useColumnEditActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
    // null cancels the edit; a string value updates the in-progress name
    setEditingColumnName: (name: string | null) => {
      if (name === null) dispatch({ type: "COLUMN/RENAME_CANCEL" });
      else dispatch({ type: "COLUMN/RENAME_CHANGE", payload: { name } });
    },
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
  }), [dispatch]);
}
