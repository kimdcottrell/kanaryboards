import BoardConfiguration from "./BoardConfiguration.jsx";
import RowBoard from "./RowBoard.jsx";
import TaskCreateModal from "./TaskCreateModal.jsx";
import TaskEditModal from "./TaskEditModal.jsx";

export default function BoardInner() {
  return (
    <>
      <BoardConfiguration />
      <RowBoard />
      <TaskCreateModal />
      <TaskEditModal />
    </>
  );
}
