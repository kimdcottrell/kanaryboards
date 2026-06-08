import { RouterProvider } from "react-router-dom";
import { BoardProvider } from "./context/BoardContext.tsx";
import { router } from "@lib/spa-router.ts";

export default function BoardController({ boardId, isAuthenticated }) {
  return (
    <BoardProvider boardId={boardId} isAuthenticated={isAuthenticated}>
      <RouterProvider router={router} />
    </BoardProvider>
  );
}
