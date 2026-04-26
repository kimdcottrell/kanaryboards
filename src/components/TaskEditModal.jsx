import Modal from "./Modal.jsx";
import TaskForm from "./TaskForm.jsx";
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
    clearChecklistPreview,
  } = useBoard();

  return (
    <Modal open={taskEditModalOpen} onClose={cancelEditTask}>
      <h3 class="text-xl font-semibold">Edit task</h3>
      {editTaskDraft
        ? (
          <TaskForm
            taskDraft={editTaskDraft}
            setTaskDraft={setEditTaskDraft}
            onSubmit={saveTaskEdit}
            submitLabel="Save"
            onDelete={() => deleteTask(editTaskDraft.id)}
            addChecklistItem={addEditChecklistItem}
            updateChecklistItem={updateEditChecklistItem}
            deleteChecklistItem={deleteEditChecklistItem}
            handleChecklistKeyDown={handleChecklistKeyDown}
            setChecklistInputRef={setChecklistInputRef}
            checklistPrompt={checklistPrompt}
            checklistPreview={checklistPreview}
            isGeneratingChecklist={isGeneratingChecklist}
            checklistModalError={checklistModalError}
            setChecklistPrompt={setChecklistPrompt}
            generateChecklistItems={generateChecklistItems}
            applyChecklist={applyChecklistPreview}
            clearChecklistPreview={clearChecklistPreview}
          >
            <div class="grid grid-cols-2 gap-4 items-start">
              <fieldset class="fieldset">
                <legend
                  class="fieldset-legend"
                  for={`edit-column-select-${editTaskDraft.id}`}
                >
                  Status
                </legend>
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
              </fieldset>
              <fieldset class="fieldset">
                <legend
                  class="fieldset-legend"
                  for={`edit-row-select-${editTaskDraft.id}`}
                >
                  Row
                </legend>
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
              </fieldset>
            </div>
          </TaskForm>
        )
        : <p class="mt-4 text-sm">Loading task…</p>}
    </Modal>
  );
}
