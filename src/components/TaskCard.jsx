import { useBoard } from "./context/useBoard.ts";

export default function TaskCard({ task, row, column }) {
  const {
    editingTaskId,
    startEditTask,
    handleDragStart,
    handleDragEnd,
    toggleTaskChecklist,
  } = useBoard();
  const isEditing = task.id === editingTaskId;
  return (
    <article
      draggable={!isEditing}
      onDragStart={isEditing ? undefined : (event) =>
        handleDragStart(
          task,
          row.id,
          column.id,
          event,
        )}
      onDragEnd={handleDragEnd}
      className="overflow-hidden shadow-sm shadow-base-900/5"
    >
      <div className="block">
        <div className="join-item bg-base-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-base font-semibold">
              {task.title}
            </h5>
            <button
              type="button"
              className="btn text-base-100 btn-sm btn-square text-md transition"
              onClick={() => startEditTask(task)}
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
        {task.description && (
          <div className="bg-base-100 p-4">
            <p className="text-xs uppercase tracking-[0.18em]">
              Description
            </p>
            <p className="mt-1 text-sm">
              {task.description}
            </p>
          </div>
        )}

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
