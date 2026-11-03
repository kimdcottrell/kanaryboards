import { useCallback, useMemo } from "react";
import { useBoardDispatch, useColumnEditState } from "../BoardContext.tsx";
import { validateEntity } from "./shared.ts";
import type { FieldError } from "./shared.ts";
import type { Column } from "../types.ts";

export function useColumnEditActions() {
  const dispatch = useBoardDispatch();
  const { editingColumnName } = useColumnEditState();

  const dispatchOnly = useMemo(() => ({
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
  }), [dispatch]);

  // Resolves to the validation error to show (the edit stays open), or null
  // once saved.
  const saveColumnTitle = useCallback(
    async (columnId: string): Promise<FieldError | null> => {
      const checked = await validateEntity("column", {
        title: editingColumnName,
      });
      if (!checked.ok) return checked;
      dispatch({
        type: "COLUMN/RENAME_SAVE",
        payload: { columnId, title: checked.values.title },
      });
      return null;
    },
    [editingColumnName, dispatch],
  );

  return { ...dispatchOnly, saveColumnTitle };
}
