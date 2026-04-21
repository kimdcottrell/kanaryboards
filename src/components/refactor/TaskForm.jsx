import ChecklistSection from "./ChecklistSection";

export default function TaskForm({
  taskDraft,
  setTaskDraft,
  createTask,
  closeTaskForm,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
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
        <ChecklistSection
          checklist={taskDraft.checklist}
          addChecklistItem={addChecklistItem}
          updateChecklistItem={updateChecklistItem}
          deleteChecklistItem={deleteChecklistItem}
          handleChecklistKeyDown={handleChecklistKeyDown}
          setChecklistInputRef={setChecklistInputRef}
        />
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
