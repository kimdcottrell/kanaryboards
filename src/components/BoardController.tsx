import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BoardProvider } from "./context/BoardContext.tsx";
import BoardView from "./BoardView.tsx";

export default function BoardController({ boardId, isAuthenticated }) {
  return (
    <BrowserRouter>
      <BoardProvider boardId={boardId} isAuthenticated={isAuthenticated}>
        <Routes>
          <Route path="/" element={<BoardView />} />
          <Route path="/task/:taskId" element={<BoardView />} />
        </Routes>
      </BoardProvider>
    </BrowserRouter>
  );
}
