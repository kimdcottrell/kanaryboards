import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BoardConfigModal from "./BoardConfigModal.tsx";
import BoardMenu from "./BoardMenu.tsx";
import RowBoard from "./RowBoard.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import TaskEditModal from "./TaskEditModal.tsx";
import { useBoardDataState, useTaskActions } from "./context/hooks.ts";

export default function BoardView() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { tasks, boardLoaded } = useBoardDataState();
  const { startEditTask } = useTaskActions();
  const syncedTaskId = useRef<string | undefined>(undefined);

  // Reflect board-load state onto the root element so e2e tests can gate input
  // interaction on hydration completing — an in-flight BOARD/LOAD re-render
  // otherwise clobbers a freshly-filled controlled input back to its state value.
  useEffect(() => {
    document.documentElement.dataset.boardLoaded = String(boardLoaded);
  }, [boardLoaded]);

  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsSticky(globalThis.scrollY > 8);
    };

    globalThis.addEventListener("scroll", onScroll);
    return () => globalThis.removeEventListener("scroll", onScroll);
  }, []);

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
      <BoardMenu isSticky={isSticky} />

      <BoardConfigModal data-testid="board-configuration" />
      <RowBoard data-testid="row-board" />
      <TaskCreateModal data-testid="task-create-modal" />
      <TaskEditModal data-testid="task-edit-modal" />
    </>
  );
}
