export default function TaskForm({
  taskDraft,
  setTaskDraft,
  createTask,
  closeTaskForm,
  addChecklistItem,
  updateChecklistItem,
  handleChecklistKeyDown,
  setChecklistInputRef,
}) {
  console.log("[DEBUG] TaskForm rendered - taskDraft title:", taskDraft.title);
  return (
    <article class="overflow-hidden rounded border border-base-200 p-4 shadow-sm shadow-base-900/5">
      <form class="space-y-4" onSubmit={createTask}>
        <div>
          <label class="block text-sm font-medium">
            Title
          </label>
          <input
            class="mt-2 w-full rounded border border-base-300 px-4 py-2 outline-none focus:border-cyan-500"
            type="text"
            value={taskDraft.title}
            onInput={(e) =>
              setTaskDraft({
                ...taskDraft,
                title: e.currentTarget.value,
              })}
            required
          />
        </div>
        <div>
          <label class="block text-sm font-medium">
            Description
          </label>
          <textarea
            class="mt-2 h-24 w-full rounded border border-base-300 px-4 py-2 outline-none focus:border-cyan-500"
            value={taskDraft.description}
            onInput={(e) =>
              setTaskDraft({
                ...taskDraft,
                description: e.currentTarget.value,
              })}
          />
        </div>
        <div class="space-y-3 rounded border border-base-300 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold">
              Checklist items
            </p>
            <button
              type="button"
              class="rounded px-3 py-1 text-sm transition"
              onClick={() => addChecklistItem(true)}
            >
              Add item
            </button>
          </div>
          <div class="space-y-3">
            {taskDraft.checklist.map((item, index) => (
              <div
                key={item.id}
                class="flex items-center gap-3 rounded border border-base-300 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onInput={() =>
                    updateChecklistItem(
                      item.id,
                      "checked",
                      !item.checked,
                    )}
                  class="h-4 w-4 rounded border-base-300 focus:ring-cyan-400"
                />
                <input
                  class="w-full bg-transparent outline-none placeholder:"
                  type="text"
                  value={item.text}
                  onInput={(e) =>
                    updateChecklistItem(
                      item.id,
                      "text",
                      e.currentTarget.value,
                    )}
                  onKeyDown={(e) =>
                    handleChecklistKeyDown(
                      e,
                      index,
                      taskDraft.checklist,
                      addChecklistItem,
                    )}
                  ref={(el) => setChecklistInputRef(item.id, el)}
                  placeholder="Checklist item"
                />
              </div>
            ))}
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded px-4 py-2 text-sm transition"
            onClick={closeTaskForm}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded px-4 py-2 text-sm font-semibold transition"
          >
            Create task
          </button>
        </div>
      </form>
    </article>
  );
}
