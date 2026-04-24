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
        <div class="form-control">
          <label class="label">
            <span class="label-text">Title</span>
          </label>
          <input
            class="input input-bordered w-full"
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
        <div class="form-control">
          <label class="label">
            <span class="label-text">Description</span>
          </label>
          <textarea
            class="textarea textarea-bordered w-full h-24"
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
            class="btn btn-ghost"
            onClick={closeTaskForm}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
          >
            Create task
          </button>
        </div>
      </form>
    </article>
  );
}
