import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";
import { validateEntity } from "./shared.ts";
import type { FieldError } from "./shared.ts";

export function useRowActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
    deleteRow: (rowId: string) =>
      dispatch({ type: "ROW/DELETE", payload: { rowId } }),
    moveRow: (fromIndex: number, toIndex: number) =>
      dispatch({ type: "ROW/MOVE", payload: { fromIndex, toIndex } }),
    moveRowUp: (index: number) =>
      dispatch({
        type: "ROW/MOVE",
        payload: { fromIndex: index, toIndex: index - 1 },
      }),
    moveRowDown: (index: number) =>
      dispatch({
        type: "ROW/MOVE",
        payload: { fromIndex: index, toIndex: index + 1 },
      }),
    updateRowColor: (rowId: string, color: string) =>
      dispatch({ type: "ROW/UPDATE_COLOR", payload: { rowId, color } }),
    // Resolves to the validation error to show, or null once renamed.
    renameRow: async (
      rowId: string,
      name: string,
    ): Promise<FieldError | null> => {
      const checked = await validateEntity("row", { title: name });
      if (!checked.ok) return checked;
      dispatch({
        type: "ROW/RENAME",
        payload: { rowId, name: checked.values.title },
      });
      return null;
    },
  }), [dispatch]);
}
