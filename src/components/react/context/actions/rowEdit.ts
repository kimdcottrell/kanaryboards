import { useCallback, useMemo } from "react";
import { useBoardDispatch, useRowEditState } from "../BoardContext.tsx";
import { validateEntity } from "./shared.ts";
import type { FieldError } from "./shared.ts";
import type { Row } from "@lib/types.ts";

export function useRowEditActions() {
  const dispatch = useBoardDispatch();
  const { editingRowName } = useRowEditState();

  const dispatchOnly = useMemo(() => ({
    // null cancels the edit; a string value updates the in-progress name
    setEditingRowName: (name: string | null) => {
      if (name === null) dispatch({ type: "ROW/EDIT_CANCEL" });
      else dispatch({ type: "ROW/EDIT_CHANGE", payload: { name } });
    },
    editRowTitle: (row: Row) =>
      dispatch({
        type: "ROW/EDIT_START",
        payload: { rowId: row.id, currentName: row.title },
      }),
  }), [dispatch]);

  // Resolves to the validation error to show (the edit stays open), or null
  // once saved.
  const saveRowTitle = useCallback(
    async (rowId: string): Promise<FieldError | null> => {
      const checked = await validateEntity("row", { title: editingRowName });
      if (!checked.ok) return checked;
      dispatch({
        type: "ROW/EDIT_SAVE",
        payload: { rowId, title: checked.values.title },
      });
      return null;
    },
    [editingRowName, dispatch],
  );

  return { ...dispatchOnly, saveRowTitle };
}
