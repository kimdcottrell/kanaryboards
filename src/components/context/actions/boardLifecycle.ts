import { useCallback } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";
import { STORAGE_KEY } from "../constants.ts";

export function useBoardLifecycleActions() {
  const dispatch = useBoardDispatch();

  const confirmResetBoard = useCallback(() => {
    if (typeof globalThis.confirm === "undefined") return;
    const confirmed = globalThis.confirm(
      "Reset the board?\n\nThis will set ALL rows, columns, and tasks back to defaults.\n\nIt cannot be undone.",
    );
    if (confirmed) {
      dispatch({ type: "BOARD/RESET" });
      globalThis.localStorage?.removeItem(STORAGE_KEY);
      fetch("/api/board", { method: "DELETE" });
    }
  }, [dispatch]);

  return { confirmResetBoard };
}
