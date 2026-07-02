import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RowBoard from "../RowBoard.tsx";
import TaskCreateModal from "../TaskCreateModal.tsx";
import TaskEditModal from "../TaskEditModal.tsx";
import { useBoardDataState, useTaskActions } from "../context/hooks.ts";

export default function DemoBoardView() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { tasks, boardLoaded } = useBoardDataState();
  const { startEditTask } = useTaskActions();
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
      navigate("/dashboard", { replace: true });
    }
  }, [boardLoaded, taskId, tasks]);

  return (
    <>
      <RowBoard data-testid="row-board" />
      <TaskCreateModal data-testid="task-create-modal" />
      <TaskEditModal data-testid="task-edit-modal" />
    </>
  );
}
