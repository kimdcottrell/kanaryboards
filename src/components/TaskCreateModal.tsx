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
          columns={columns}
          rows={rows}
          requireRowColumn
        />
      )}
    </Modal>
  );
}
