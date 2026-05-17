import BoardConfiguration from "./BoardConfiguration.jsx";
import RowBoard from "./RowBoard.jsx";
import TaskCreateModal from "./TaskCreateModal.jsx";
import TaskEditModal from "./TaskEditModal.jsx";

export default function BoardInner() {
  return (
    <>
      <BoardConfiguration data-testid="board-configuration" />
      <RowBoard data-testid="row-board" />
      <TaskCreateModal data-testid="task-create-modal" />
      <TaskEditModal data-testid="task-edit-modal" />
    </>
  );
}
