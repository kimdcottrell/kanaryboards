import Modal from "../Modal";
import TaskForm from "./TaskForm";
import { ChecklistGenerationCollapse } from "./ChecklistSection";

export default function TaskCreateModal({ board }) {
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
  } = board;

  return (
    <Modal open={taskCreateModalOpen} onClose={closeTaskCreateModal}>
      <h3 class="text-xl font-semibold">Add task</h3>
      <p class="text-sm text-base-content/70 mt-2 mb-4">
        Create a new task in the selected column.
      </p>
      <TaskForm
        taskDraft={taskDraft}
        setTaskDraft={setTaskDraft}
        createTask={createTask}
        closeTaskForm={closeTaskCreateModal}
        addChecklistItem={addChecklistItem}
        updateChecklistItem={updateChecklistItem}
        deleteChecklistItem={deleteChecklistItem}
        handleChecklistKeyDown={handleChecklistKeyDown}
        setChecklistInputRef={setChecklistInputRef}
      />
      <div class="mt-4">
        <ChecklistGenerationCollapse
          taskDraft={taskDraft}
          checklistPrompt={checklistPrompt}
          checklistPreview={checklistPreview}
          isGeneratingChecklist={isGeneratingChecklist}
          checklistModalError={checklistModalError}
          setChecklistPrompt={setChecklistPrompt}
          generateChecklistItems={generateChecklistItems}
          applyChecklist={applyChecklistPreviewToDraft}
        />
      </div>
    </Modal>
  );
}
