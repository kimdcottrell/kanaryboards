import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BoardConfiguration from "./BoardConfiguration.tsx";
import RowBoard from "./RowBoard.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import TaskEditModal from "./TaskEditModal.tsx";
import { useBoard } from "./context/useBoard.ts";

export default function BoardView() {
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
