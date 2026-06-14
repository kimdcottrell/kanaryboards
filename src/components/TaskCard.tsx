import { useNavigate } from "react-router-dom";
import { useTaskActions } from "./context/hooks.ts";
import { useRenderCount } from "@lib/use-render-count.ts";

export default function TaskCard({
  task,
  row,
  onDragOver,
  isDropBefore,
  isDropAfter,
  isDragging,
}) {
  const navigate = useNavigate();
  const {
    startEditTask,
    toggleTaskChecklist,
    handleTaskDragEnd,
    handleTaskDragStart,
  } = useTaskActions();
  const renderCount = useRenderCount();

  return (
    <article
      id={task.id}
      data-render-count={renderCount}
      draggable="true"
      onDragStart={handleTaskDragStart(task)}
      onDragEnd={handleTaskDragEnd}
      onDragOver={onDragOver}
      className="overflow-hidden shadow-sm shadow-base-900/5"
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderTop: `2px solid ${isDropBefore ? row.color : "transparent"}`,
        borderBottom: `2px solid ${isDropAfter ? row.color : "transparent"}`,
      }}
    >
      <div className="block">
        <div className="join-item bg-base-200 p-4">
          <div
            onClick={() => {
              startEditTask(task);
              navigate(`/task/${task.id}`);
            }}
            className="flex items-center justify-between gap-3 cursor-grab"
          >
            <h5 className="text-base font-semibold">
              {task.title}
            </h5>
            <button
              type="button"
              onMouseEnter={(e) =>
                e.currentTarget.style.backgroundColor = row.color}
              onMouseLeave={(e) =>
                e.currentTarget.style.backgroundColor =
                  `color-mix(in srgb, ${row.color} 60%, transparent)`}
              className="btn text-base-100 btn-sm btn-square text-md"
              style={{
                backgroundColor:
                  `color-mix(in srgb, ${row.color} 60%, transparent)`,
              }}
            >
              <span className="iconify hugeicons--pencil-edit-02 text-xl">
              </span>
            </button>
          </div>
        </div>
        {task.checklist &&
          task.checklist.length > 0 && (
          <div className="space-y-2 bg-base-100 p-4">
            <p className="text-xs uppercase tracking-[0.18em]">
              Checklist
            </p>
            <div className="space-y-2">
              {task.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() =>
                      toggleTaskChecklist(
                        task.id,
                        item.id,
                      )}
                    className="checkbox checkbox-sm"
                  />
                  <span
                    className={item.checked ? "line-through " : ""}
                  >
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
