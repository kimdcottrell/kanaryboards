import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";

export function useColumnFilterActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
    toggleColumnFilter: (columnId: string) =>
      dispatch({ type: "VIEW/TOGGLE_COLUMN_FILTER", payload: { columnId } }),
  }), [dispatch]);
}
