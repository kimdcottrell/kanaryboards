import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BoardConfiguration from "./BoardConfiguration.jsx";
import RowBoard from "./RowBoard.jsx";
import TaskCreateModal from "./TaskCreateModal.jsx";
import TaskEditModal from "./TaskEditModal.jsx";
import { useBoard } from "./context/useBoard.ts";

export default function BoardInner() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { tasks, boardLoaded, startEditTask } = useBoard();

  useEffect(() => {
    if (!boardLoaded || !taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      startEditTask(task);
    } else {
      navigate("/", { replace: true });
    }
  }, [boardLoaded, taskId, tasks]);

  return (
    <>
      <BoardConfiguration data-testid="board-configuration" />
      <RowBoard data-testid="row-board" />
      <TaskCreateModal data-testid="task-create-modal" />
      <TaskEditModal data-testid="task-edit-modal" />
    </>
  );
}
