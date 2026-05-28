import Modal from "./Modal.tsx";
import TaskForm from "./TaskForm.tsx";
import { useBoard } from "./context/useBoard.ts";

export default function TaskCreateModal() {
  const {
    taskCreateModalOpen,
    taskDraft,
    setTaskDraft,
    createTask,
    closeTaskCreateModal,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    handleChecklistKeyDown,
    setChecklistInputRef,
    checklistPrompt,
    checklistPreview,
    isGeneratingChecklist,
    checklistModalError,
    setChecklistPrompt,
    generateChecklistItems,
    applyChecklistPreviewToDraft,
    clearChecklistPreview,
  } = useBoard();

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
        />
      )}
    </Modal>
  );
}
