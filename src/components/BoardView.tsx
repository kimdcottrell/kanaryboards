import { useEffect, useRef } from "react";
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
  const syncedTaskId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!boardLoaded || !taskId) {
      syncedTaskId.current = undefined;
      return;
    }
    if (syncedTaskId.current === taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      startEditTask(task);
      syncedTaskId.current = taskId;
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
