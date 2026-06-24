import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BoardConfigModal from "./BoardConfigModal.tsx";
import RowBoard from "./RowBoard.tsx";
import TaskCreateModal from "./TaskCreateModal.tsx";
import TaskEditModal from "./TaskEditModal.tsx";
import {
  useBoardConfigActions,
  useBoardDataState,
  useTaskActions,
} from "./context/hooks.ts";

export default function BoardView() {
  const navigate = useNavigate();
  const { taskId } = useParams();
  const { tasks, columns, boardLoaded } = useBoardDataState();
  const { startEditTask } = useTaskActions();
  const { openBoardConfigModal } = useBoardConfigActions();
  const syncedTaskId = useRef<string | undefined>(undefined);

  const inProgressColumnIds = new Set(
    columns.filter((c) => c.title === "In Progress").map((c) => c.id),
  );
  const inProgressCount =
    tasks.filter((t) => inProgressColumnIds.has(t.colId)).length;

  const reviewColumnIds = new Set(
    columns.filter((c) => c.title === "Review").map((c) => c.id),
  );
  const reviewCount = tasks.filter((t) => reviewColumnIds.has(t.colId)).length;

  // Reflect board-load state onto the root element so e2e tests can gate input
  // interaction on hydration completing — an in-flight BOARD/LOAD re-render
  // otherwise clobbers a freshly-filled controlled input back to its state value.
  useEffect(() => {
    document.documentElement.dataset.boardLoaded = String(boardLoaded);
  }, [boardLoaded]);

  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsSticky(globalThis.scrollY > 12);
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
      <ul
        id="board-menu"
        className={`menu
          ${isSticky ? "fixed top-0" : "absolute top-3"}
          left-1/2 -translate-x-1/2
          z-100 bg-base-100
          lg:menu-horizontal rounded-box
          w-fit
        `}
      >
        <li>
          <a>
            <span className="iconify hugeicons--task-01"></span>
            In Progress
            <span className="badge badge-sm font-roboto-slab font-semibold badge-info">
              {inProgressCount}
            </span>
          </a>
        </li>
        <li>
          <a>
            <span className="iconify hugeicons--arrow-up-narrow-wide"></span>
            Review
            <span className="badge badge-sm font-roboto-slab font-semibold badge-success">
              {reviewCount}
            </span>
          </a>
        </li>
        <li>
          <a id="board-config-collapse-toggle" onClick={openBoardConfigModal}>
            <span className="iconify hugeicons--settings-01"></span>
            Board Config
          </a>
        </li>
      </ul>

      <BoardConfigModal data-testid="board-configuration" />
      <RowBoard data-testid="row-board" />
      <TaskCreateModal data-testid="task-create-modal" />
      <TaskEditModal data-testid="task-edit-modal" />
    </>
  );
}
