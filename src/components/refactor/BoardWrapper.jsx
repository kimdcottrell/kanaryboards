import { BoardProvider } from "./context/BoardContext.tsx";
import BoardInner from "./BoardInner.jsx";

export default function BoardWrapper() {
  return (
    <BoardProvider>
      <BoardInner />
    </BoardProvider>
  );
}
