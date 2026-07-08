import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";

export function useBoardConfigActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
    openBoardConfigModal: (scrollTarget?: string) =>
      dispatch({ type: "BOARD_CONFIG/OPEN_MODAL", payload: { scrollTarget } }),
    closeBoardConfigModal: () => dispatch({ type: "BOARD_CONFIG/CLOSE_MODAL" }),
  }), [dispatch]);
}
