import { useBoard } from "./store";
import BoardConfiguration from "./BoardConfiguration";
import RowBoard from "./RowBoard";
import TaskCreateModal from "./TaskCreateModal";
import TaskEditModal from "./TaskEditModal";

export default function BoardWrapper() {
  const board = useBoard();

  return (
    <>
      <BoardConfiguration board={board} />
      <RowBoard board={board} />
      <TaskCreateModal board={board} />
      <TaskEditModal board={board} />
    </>
  );
}
