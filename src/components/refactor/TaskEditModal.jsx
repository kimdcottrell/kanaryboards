import Modal from "../Modal.jsx";
import ChecklistSection, {
  ChecklistGenerationCollapse,
} from "./ChecklistSection.jsx";
import { useBoard } from "./context/useBoard.ts";

export default function TaskEditModal() {
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
    deleteEditChecklistItem,
    handleChecklistKeyDown,
    setChecklistInputRef,
    checklistPrompt,
    checklistPreview,
    isGeneratingChecklist,
    checklistModalError,
    setChecklistPrompt,
    generateChecklistItems,
    applyChecklistPreview,
  } = useBoard();
  console.log(
    "[DEBUG] TaskEditModal rendered - open:",
    taskEditModalOpen,
    "taskId:",
    editTaskDraft?.id,
  );

  return (
    <Modal open={taskEditModalOpen} onClose={cancelEditTask}>
      <h3 class="text-xl font-semibold">Edit task</h3>
      {editTaskDraft
        ? (
          <form class="mt-4 space-y-4" onSubmit={saveTaskEdit}>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Title</span>
              </label>
              <input
                class="input input-bordered w-full"
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
            <div class="form-control">
              <label class="label">
                <span class="label-text">Description</span>
              </label>
              <textarea
                class="textarea textarea-bordered w-full h-24"
                value={editTaskDraft.description}
                onInput={(e) =>
                  setEditTaskDraft({
                    ...editTaskDraft,
                    description: e.currentTarget.value,
                  })}
              />
            </div>
            <div class="form-control">
              <label
                class="label"
                for={`edit-column-select-${editTaskDraft.id}`}
              >
                <span class="label-text">Status</span>
              </label>
              <select
                id={`edit-column-select-${editTaskDraft.id}`}
                class="select select-bordered w-full"
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
            <div class="form-control">
              <label
                class="label"
                for={`edit-row-select-${editTaskDraft.id}`}
              >
                <span class="label-text">Row</span>
              </label>
              <select
                id={`edit-row-select-${editTaskDraft.id}`}
                class="select select-bordered w-full"
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
            <ChecklistSection
              checklist={editTaskDraft.checklist}
              addChecklistItem={addEditChecklistItem}
              updateChecklistItem={updateEditChecklistItem}
              deleteChecklistItem={deleteEditChecklistItem}
              handleChecklistKeyDown={handleChecklistKeyDown}
              setChecklistInputRef={setChecklistInputRef}
            />
            <ChecklistGenerationCollapse
              taskDraft={editTaskDraft}
              checklistPrompt={checklistPrompt}
              checklistPreview={checklistPreview}
              isGeneratingChecklist={isGeneratingChecklist}
              checklistModalError={checklistModalError}
              setChecklistPrompt={setChecklistPrompt}
              generateChecklistItems={generateChecklistItems}
              applyChecklist={applyChecklistPreview}
            />
            <div class="flex justify-between gap-2">
              <button
                type="button"
                class="btn btn-error btn-outline"
                onClick={() => deleteTask(editTaskDraft.id)}
              >
                Delete
              </button>
              <button
                type="submit"
                class="btn btn-primary"
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
