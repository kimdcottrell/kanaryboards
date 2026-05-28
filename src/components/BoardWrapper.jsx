import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BoardProvider } from "./context/BoardContext.tsx";
import BoardInner from "./BoardInner.jsx";

export default function BoardWrapper({ boardId, isAuthenticated }) {
  return (
    <BrowserRouter>
      <BoardProvider boardId={boardId} isAuthenticated={isAuthenticated}>
        <Routes>
          <Route path="/" element={<BoardInner />} />
          <Route path="/task/:taskId" element={<BoardInner />} />
        </Routes>
      </BoardProvider>
    </BrowserRouter>
  );
}
