import { useNavigate } from "react-router-dom";
import { useTaskActions } from "./context/hooks.ts";
import { useRenderCount } from "@lib/use-render-count.ts";
import { hasDescriptionContent } from "@lib/lexical-content.ts";

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
      className="group rounded shadow-sm shadow-base-900/5"
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderTop: `2px solid ${isDropBefore ? row.color : "transparent"}`,
        borderBottom: `2px solid ${isDropAfter ? row.color : "transparent"}`,
      }}
    >
      <div className="block">
        <div className="bg-base-200 p-3">
          <div
            onClick={() => {
              startEditTask(task);
              navigate(`/dashboard/task/${task.id}`);
            }}
            className="flex items-center justify-between gap-3 cursor-grab"
          >
            <h5 className="text-base font-semibold">
              {task.title}
            </h5>

            <span className="iconify hugeicons--edit-03 text-base-content text-md opacity-0 group-hover:opacity-100 shrink-0">
            </span>
          </div>
        </div>

        {(hasDescriptionContent(task.description) ||
          (task.checklist && task.checklist.length > 0)) && (
          <div className="space-y-2 bg-base-100 p-3">
            {hasDescriptionContent(task.description) && (
              <div
                className="tooltip tooltip-bottom"
                data-tip="This task has a description."
              >
                <span className="iconify hugeicons--bar-chart-horizontal">
                </span>
              </div>
            )}
            {task.checklist &&
              task.checklist.length > 0 && (
              <section className="block">
                {hasDescriptionContent(task.description) && (
                  <hr className="mb-3 opacity-50" />
                )}

                <p className="inline-block text-xs uppercase tracking-[0.18em] mb-3">
                  Checklist
                </p>
                <div
                  style={{ backgroundColor: row.color }}
                  className="badge badge-sm text-base-100"
                >
                  {task.checklist.filter((item) => item.checked).length}/{task
                    .checklist.length}
                </div>

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
              </section>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
