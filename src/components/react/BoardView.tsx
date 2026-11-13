import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BoardConfigModal from "./config/board/BoardConfigModal.tsx";
import BoardDock from "./BoardDock.tsx";
import BoardMenu from "./BoardMenu.tsx";
import CreateRowModal from "./config/board/CreateRowModal.tsx";
import RowBoard from "./RowBoard.tsx";
import TaskCreateModal from "./task/modal/TaskCreateModal.tsx";
import TaskEditModal from "./task/modal/TaskEditModal.tsx";
import TaskViewOnlyModal from "./task/modal/TaskViewOnlyModal.tsx";
import {
  useBoardDataState,
  useTaskActions,
  useTaskEditState,
} from "./context/hooks.ts";
import { findByShortId } from "@lib/dashboard/short-id.ts";

export default function BoardView() {
  const navigate = useNavigate();
  const { taskId, rowId } = useParams();
  const { rows, tasks, boardLoaded } = useBoardDataState();
  const { startEditTask } = useTaskActions();
  const { taskEditModalOpen } = useTaskEditState();
  const syncedTaskId = useRef<string | undefined>(undefined);
  const wasEditModalOpen = useRef(false);
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
    const task = findByShortId(tasks, taskId);
    if (task) {
      startEditTask(task);
      syncedTaskId.current = taskId;
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [boardLoaded, taskId, tasks]);

  // The board closed the task modal itself (its task was saved elsewhere).
  // Every user action that closes it also leaves /dashboard/task/:id; do the
  // same here, or opening that task again wouldn't change the URL.
  useEffect(() => {
    if (wasEditModalOpen.current && !taskEditModalOpen && taskId) {
      navigate("/dashboard", { replace: true });
    }
    wasEditModalOpen.current = taskEditModalOpen;
  }, [taskEditModalOpen]);

  useEffect(() => {
    if (!boardLoaded || !rowId) {
      syncedRowId.current = undefined;
      return;
    }
    if (syncedRowId.current === rowId) return;
    const row = findByShortId(rows, rowId);
    if (row) {
      requestAnimationFrame(() => {
        document.getElementById(`row-section-${row.id}`)?.scrollIntoView({
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
      <TaskViewOnlyModal />
    </div>
  );
}
