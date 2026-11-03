import { useNavigate } from "react-router-dom";
import { useTaskActions } from "../context/hooks.ts";
import { useRenderCount } from "@lib/dashboard/use-render-count.ts";
import type { Row, Task } from "../context/types.ts";
import { hasLexicalText } from "@lib/lexical.ts";
import { daysUntilPurge } from "../context/constants.ts";
import { useHasEditDraft } from "./editDraftStore.ts";
import type { DragEvent } from "react";

export default function TaskCard({
  task,
  row,
  onDragOver,
  isDropBefore,
  isDropAfter,
  isDragging,
  isTrash,
}: {
  task: Task;
  row: Row;
  onDragOver: (event: DragEvent) => void;
  isDropBefore: boolean;
  isDropAfter: boolean;
  isDragging: boolean;
  isTrash: boolean;
}) {
  const navigate = useNavigate();
  const {
    startEditTask,
    toggleTaskChecklist,
    handleTaskDragEnd,
    handleTaskDragStart,
  } = useTaskActions();
  const renderCount = useRenderCount();
  const daysLeft = isTrash ? daysUntilPurge(task.trashedAt, Date.now()) : 0;
  const hasEditDraft = useHasEditDraft(task.id);

  return (
    <article
      id={task.id}
      data-render-count={renderCount}
      draggable="true"
      onDragStart={handleTaskDragStart(task)}
      onDragEnd={handleTaskDragEnd}
      onDragOver={onDragOver}
      onClick={() => {
        startEditTask(task);
        navigate(`/dashboard/task/${task.id}`);
      }}
      className={`group rounded shadow-sm shadow-base-900/5 cursor-grab${
        hasEditDraft ? " indicator flex flex-col w-full" : ""
      }`}
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderTop: `2px solid ${isDropBefore ? row.color : "transparent"}`,
        borderBottom: `2px solid ${isDropAfter ? row.color : "transparent"}`,
      }}
    >
      {hasEditDraft && (
        <span className="indicator-item indicator-center badge badge-warning font-bold">
          Edited but not saved
        </span>
      )}
      <div className="block">
        <div className="bg-base-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-base font-semibold">
              {task.title}
            </h5>

            <span className="iconify hugeicons--edit-03 text-base-content text-md opacity-0 group-hover:opacity-100 shrink-0">
            </span>
          </div>
        </div>

        {isTrash && (
          <div className="bg-base-100 p-3">
            <p className="text-sm">
              {daysLeft} {daysLeft === 1 ? "day" : "days"}{" "}
              until permanent deletion.
            </p>
          </div>
        )}
        {!isTrash && (hasLexicalText(task.description) ||
          (task.checklist && task.checklist.length > 0)) &&
          (
            <div className="space-y-2 bg-base-100 p-3">
              {hasLexicalText(task.description) && (
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
                  {hasLexicalText(task.description) && (
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

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="checklist-container w-fit space-y-2"
                  >
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
