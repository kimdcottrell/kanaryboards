import Modal from "../Modal";

export default function TaskEditModal({ board }) {
  console.log("[DEBUG] TaskEditModal rendered - open:", board.taskEditModalOpen, "taskId:", board.editTaskDraft?.id);
  const {
    taskEditModalOpen,
    editTaskDraft,
    columns,
    rows,
    cancelEditTask,
    saveTaskEdit,
    deleteTask,
    setEditTaskDraft,
    addEditChecklistItem,
    updateEditChecklistItem,
    handleChecklistKeyDown,
    setChecklistInputRef,
    openChecklistModal,
  } = board;

  return (
    <Modal open={taskEditModalOpen} onClose={cancelEditTask}>
      <h3 class="text-xl font-semibold">Edit task</h3>
      {editTaskDraft
        ? (
          <form class="mt-4 space-y-4" onSubmit={saveTaskEdit}>
            <div>
              <label class="block text-sm font-medium">
                Title
              </label>
              <input
                class="mt-2 w-full rounded border border-base-300 px-4 py-2 outline-none focus:border-cyan-500"
                type="text"
                value={editTaskDraft.title}
                onInput={(e) =>
                  setEditTaskDraft({
                    ...editTaskDraft,
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
                value={editTaskDraft.description}
                onInput={(e) =>
                  setEditTaskDraft({
                    ...editTaskDraft,
                    description: e.currentTarget.value,
                  })}
              />
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em]">
                Status
              </p>
              <select
                id={`edit-column-select-${editTaskDraft.id}`}
                class="mt-2 w-full rounded border border-base-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                value={editTaskDraft.colId}
                onChange={(e) =>
                  setEditTaskDraft({
                    ...editTaskDraft,
                    colId: e.currentTarget.value,
                  })}
              >
                {columns.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em]">
                Row
              </p>
              <select
                id={`edit-row-select-${editTaskDraft.id}`}
                class="mt-2 w-full rounded border border-base-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                value={editTaskDraft.rowId}
                onChange={(e) =>
                  setEditTaskDraft({
                    ...editTaskDraft,
                    rowId: e.currentTarget.value,
                  })}
              >
                {rows.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div class="space-y-3 rounded border border-base-300 p-4">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-semibold">
                  Checklist items
                </p>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded px-3 py-1 text-sm transition"
                    onClick={() => addEditChecklistItem(true)}
                  >
                    Add item
                  </button>
                  <button
                    type="button"
                    class="rounded border border-base-300 px-3 py-1 text-sm transition"
                    onClick={() => openChecklistModal(editTaskDraft)}
                    aria-label="Generate checklist items"
                  >
                    🪄
                  </button>
                </div>
              </div>
              <div class="space-y-3">
                {editTaskDraft.checklist.map((item, index) => (
                  <div
                    key={item.id}
                    class="flex items-center gap-3 rounded border border-base-300 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onInput={() =>
                        updateEditChecklistItem(
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
                        updateEditChecklistItem(
                          item.id,
                          "text",
                          e.currentTarget.value,
                        )}
                      onKeyDown={(e) =>
                        handleChecklistKeyDown(
                          e,
                          index,
                          editTaskDraft.checklist,
                          addEditChecklistItem,
                        )}
                      ref={(el) => setChecklistInputRef(item.id, el)}
                      placeholder="Checklist item"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="justify-self-start rounded px-4 py-2 text-sm font-semibold transition"
                onClick={() => deleteTask(editTaskDraft.id)}
              >
                Delete
              </button>
              <button
                type="submit"
                class="ml-auto rounded px-4 py-2 text-sm font-semibold transition justify-self-end"
              >
                Save
              </button>
            </div>
          </form>
        )
        : <p class="mt-4 text-sm">Loading task…</p>}
    </Modal>
  );
}
