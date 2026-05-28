import { BrowserRouter } from "react-router-dom";
import { BoardProvider } from "./context/BoardContext.tsx";
import BoardInner from "./BoardInner.jsx";

export default function BoardWrapper(
  { boardId, initialTaskId, isAuthenticated },
) {
  return (
    <BrowserRouter>
      <BoardProvider boardId={boardId} isAuthenticated={isAuthenticated}>
        <BoardInner initialTaskId={initialTaskId} />
      </BoardProvider>
    </BrowserRouter>
  );
}
