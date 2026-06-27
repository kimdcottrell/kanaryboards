import Modal from "./Modal.tsx";
import TaskForm from "./TaskForm.tsx";
import {
  handleChecklistKeyDown,
  useBoardDataState,
  useBoardRefs,
  useChecklistAIActions,
  useChecklistAIState,
  useTaskActions,
  useTaskCreateActions,
  useTaskCreateState,
} from "./context/hooks.ts";

export default function TaskCreateModal() {
  const { columns, rows } = useBoardDataState();
  const { taskCreateModalOpen, taskDraft } = useTaskCreateState();
  const {
    setTaskDraft,
    createTask,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItem,
  } = useTaskCreateActions();
  const { closeTaskCreateModal } = useTaskActions();
  const { setChecklistInputRef } = useBoardRefs();
  const {
    checklistPrompt,
    checklistPreview,
    isGeneratingChecklist,
    checklistModalError,
  } = useChecklistAIState();
  const {
    setChecklistPrompt,
    generateChecklistItems,
    applyChecklistPreviewToDraft,
    clearChecklistPreview,
  } = useChecklistAIActions();

  return (
    <Modal open={taskCreateModalOpen} onClose={closeTaskCreateModal}>
      <h3 className="text-xl font-semibold">Add task</h3>
      <p className="text-sm text-base-content/70 mt-2">
        Create a new task in the selected column.
      </p>
      {taskCreateModalOpen && (
        <TaskForm
          taskDraft={taskDraft}
          setTaskDraft={setTaskDraft}
          onSubmit={createTask}
          onCancel={closeTaskCreateModal}
          addChecklistItem={addChecklistItem}
          updateChecklistItem={updateChecklistItem}
          deleteChecklistItem={deleteChecklistItem}
          reorderChecklistItem={reorderChecklistItem}
          handleChecklistKeyDown={handleChecklistKeyDown}
          setChecklistInputRef={setChecklistInputRef}
          checklistPrompt={checklistPrompt}
          checklistPreview={checklistPreview}
          isGeneratingChecklist={isGeneratingChecklist}
          checklistModalError={checklistModalError}
          setChecklistPrompt={setChecklistPrompt}
          generateChecklistItems={generateChecklistItems}
          applyChecklist={applyChecklistPreviewToDraft}
          clearChecklistPreview={clearChecklistPreview}
        >
          <div className="grid grid-cols-2 gap-4 items-start">
            <fieldset className="fieldset">
              <label className="fieldset-legend" htmlFor="create-column-select">
                Status
              </label>
              <select
                id="create-column-select"
                className="select select-bordered validator w-full"
                value={taskDraft.colId}
                onChange={(e) =>
                  setTaskDraft({
                    ...taskDraft,
                    colId: e.currentTarget.value,
                  })}
                required
              >
                <option value="">Select a status</option>
                {columns.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
              <span className="validator-hint">Required</span>
            </fieldset>
            <fieldset className="fieldset">
              <label className="fieldset-legend" htmlFor="create-row-select">
                Row
              </label>
              <select
                id="create-row-select"
                className="select select-bordered validator w-full"
                value={taskDraft.rowId}
                onChange={(e) =>
                  setTaskDraft({
                    ...taskDraft,
                    rowId: e.currentTarget.value,
                  })}
                required
              >
                <option value="">Select a row</option>
                {rows.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
              <span className="validator-hint">Required</span>
            </fieldset>
          </div>
        </TaskForm>
      )}
    </Modal>
  );
}
