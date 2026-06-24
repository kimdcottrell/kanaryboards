import { useMemo } from "react";
import { useBoardDispatch } from "../BoardContext.tsx";

export function useBoardConfigActions() {
  const dispatch = useBoardDispatch();

  return useMemo(() => ({
    openBoardConfigModal: () => dispatch({ type: "BOARD_CONFIG/OPEN_MODAL" }),
    closeBoardConfigModal: () => dispatch({ type: "BOARD_CONFIG/CLOSE_MODAL" }),
  }), [dispatch]);
}
