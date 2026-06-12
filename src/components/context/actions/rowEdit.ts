import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";
import type { Row } from "../types.ts";

export function useRowEditActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
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
    saveRowTitle: (rowId: string) =>
      dispatch({ type: "ROW/EDIT_SAVE", payload: { rowId } }),
  }), [dispatch]);
}
