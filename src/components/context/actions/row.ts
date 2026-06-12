import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";

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
    renameRow: (rowId: string, name: string) =>
      dispatch({ type: "ROW/RENAME", payload: { rowId, name } }),
  }), [dispatch]);
}
