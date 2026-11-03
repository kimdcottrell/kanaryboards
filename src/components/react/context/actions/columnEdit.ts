import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";
import type { Column } from "../types.ts";

export function useColumnEditActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
    // null cancels the edit; a string value updates the in-progress name
    setEditingColumnName: (name: string | null) => {
      if (name === null) dispatch({ type: "COLUMN/RENAME_CANCEL" });
      else dispatch({ type: "COLUMN/RENAME_CHANGE", payload: { name } });
    },
    // rowId is null when editing outside the context of a specific row (e.g.
    // ColumnSettingsSection, where each column only renders once)
    editColumnTitle: (column: Column, rowId: string | null) =>
      dispatch({
        type: "COLUMN/RENAME_START",
        payload: {
          columnId: column.id,
          rowId,
          currentName: column.title,
        },
      }),
    saveColumnTitle: (columnId: string) =>
      dispatch({ type: "COLUMN/RENAME_SAVE", payload: { columnId } }),
  }), [dispatch]);
}
