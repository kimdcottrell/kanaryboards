export default function TaskCard({
  task,
  row,
  column,
  isEditing,
  startEditTask,
  handleDragStart,
  handleDragEnd,
  toggleTaskChecklist,
}) {
  console.log("[DEBUG] TaskCard rendered - task:", task.title);
  return (
    <article
      draggable={isEditing ? "false" : "true"}
      onDragStart={isEditing ? undefined : (event) =>
        handleDragStart(
          task,
          row.id,
          column.id,
          event,
        )}
      onDragEnd={handleDragEnd}
      class="overflow-hidden rounded shadow-sm shadow-base-900/5"
    >
      <div class="block">
        <div class="join-item bg-neutral-800/80 p-4">
          <div class="flex items-center justify-between gap-3">
            <h5 class="text-base font-semibold">
              {task.title}
            </h5>
            <button
              type="button"
              class="btn btn-sm btn-soft btn-accent text-md transition"
              onClick={() => startEditTask(task)}
            >
              <span class="iconify hugeicons--pencil-edit-02 text-xl">
              </span>
            </button>
          </div>
        </div>
        {task.description && (
          <div class="bg-neutral-800/40 p-4">
            <p class="text-xs uppercase tracking-[0.18em]">
              Description
            </p>
            <p class="mt-1 text-sm">
              {task.description}
            </p>
          </div>
        )}

        {task.checklist &&
          task.checklist.length > 0 && (
          <div class="space-y-2 bg-neutral-800/40 p-4">
            <p class="text-xs uppercase tracking-[0.18em]">
              Checklist
            </p>
            <div class="space-y-2">
              {task.checklist.map((item) => (
                <label
                  key={item.id}
                  class="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onInput={() =>
                      toggleTaskChecklist(
                        task.id,
                        item.id,
                      )}
                    class="h-4 w-4 rounded border-base-300 focus:ring-cyan-400"
                  />
                  <span
                    class={item.checked ? "line-through " : ""}
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
