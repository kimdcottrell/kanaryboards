import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BoardConfigModal from "./BoardConfigModal.tsx";
import BoardDock from "./BoardDock.tsx";
import BoardMenu from "./BoardMenu.tsx";
import CreateRowModal from "./config/board/CreateRowModal.tsx";
import RowBoard from "./RowBoard.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import TaskEditModal from "./TaskEditModal.tsx";
import { useBoardDataState, useTaskActions } from "./context/hooks.ts";

export default function BoardView() {
  const navigate = useNavigate();
  const { taskId, rowId } = useParams();
  const { rows, tasks, boardLoaded } = useBoardDataState();
  const { startEditTask } = useTaskActions();
  const syncedTaskId = useRef<string | undefined>(undefined);
  const syncedRowId = useRef<string | undefined>(undefined);

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

  useEffect(() => {
    if (!boardLoaded || !rowId) {
      syncedRowId.current = undefined;
      return;
    }
    if (syncedRowId.current === rowId) return;
    const row = rows.find((r) => r.id === rowId);
    if (row) {
      requestAnimationFrame(() => {
        document.getElementById(`row-section-${rowId}`)?.scrollIntoView({
          block: "start",
        });
      });
      syncedRowId.current = rowId;
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [boardLoaded, rowId, rows]);

  // Until the board data has loaded, keep showing the same loading state the
  // SPA.astro fallback slot renders. This bridges the gap between the React
  // island mounting and the async BOARD/LOAD dispatch, so the fallback reveals
  // an identical spinner instead of an empty board shell flashing through.
  if (!boardLoaded) {
    return (
      <div
        key="board-loading"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
      >
        <h2 className="text-xl font-semibold">Task dashboard is loading...</h2>
        <span className="loading loading-spinner loading-xl"></span>
      </div>
    );
  }

  return (
    <div key="board-loaded" className="animate-fade-in">
      <BoardMenu isSticky={isSticky} />
      <BoardDock />

      <BoardConfigModal data-testid="board-configuration" />
      <CreateRowModal data-testid="create-row-modal" />
      <RowBoard data-testid="row-board" />
      <TaskCreateModal data-testid="task-create-modal" />
      <TaskEditModal data-testid="task-edit-modal" />
    </div>
  );
}
