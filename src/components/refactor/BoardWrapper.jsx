import { useBoard } from "./store";
import BoardConfiguration from "./BoardConfiguration";
import RowBoard from "./RowBoard";
import ChecklistGenerationModal from "./ChecklistGenerationModal";
import TaskEditModal from "./TaskEditModal";

export default function BoardWrapper() {
  const board = useBoard();

  return (
    <>
      <BoardConfiguration board={board} />
      <RowBoard board={board} />
      <ChecklistGenerationModal board={board} />
      <TaskEditModal board={board} />
    </>
  );
}
