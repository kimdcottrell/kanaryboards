import { useEffect, useState } from "preact/hooks";
import Modal from "../Modal";
import TaskForm from "./TaskForm";

export default function TaskCreateModal({ board }) {
  const [checklistCollapseOpen, setChecklistCollapseOpen] = useState(false);
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

  useEffect(() => {
    if (!taskCreateModalOpen) {
      setChecklistCollapseOpen(false);
    }
  }, [taskCreateModalOpen]);

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
      <div class="collapse collapse-arrow border border-base-300 mt-4">
        <input
          type="checkbox"
          checked={checklistCollapseOpen}
          onChange={(e) => setChecklistCollapseOpen(e.currentTarget.checked)}
        />
        <div class="collapse-title font-semibold text-sm py-3">
          Generate checklist items with AI
        </div>
        <div class="collapse-content space-y-4">
          <div class="space-y-2">
            <input
              class="w-full rounded border border-base-300 px-4 py-3 outline-none focus:border-cyan-500"
              type="text"
              value={checklistPrompt}
              placeholder={taskDraft?.title || "Break down this task..."}
              onInput={(e) => setChecklistPrompt(e.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  generateChecklistItems(taskDraft);
                }
                if (event.key === "Tab" && !checklistPrompt.trim()) {
                  event.preventDefault();
                  setChecklistPrompt(taskDraft?.title || "");
                }
              }}
            />
            <p class="text-xs">
              Press Tab to fill with the task title, or Enter to generate.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded px-4 py-2 text-sm font-semibold transition"
              onClick={() => generateChecklistItems(taskDraft)}
              disabled={isGeneratingChecklist}
            >
              {isGeneratingChecklist
                ? "Generating…"
                : "Generate Checklist Items"}
            </button>
            <button
              type="button"
              class="rounded px-4 py-2 text-sm font-semibold transition hover:"
              onClick={applyChecklistPreviewToDraft}
              disabled={checklistPreview.length === 0}
            >
              Copy checklist items
            </button>
          </div>
          {checklistModalError && (
            <p class="text-sm text-error">{checklistModalError}</p>
          )}
          <div class="overflow-x-auto">
            {checklistPreview.length > 0
              ? (
                <table class="table w-full">
                  <thead>
                    <tr>
                      <th class="text-left">#</th>
                      <th class="text-left">Checklist item preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistPreview.map((item, index) => (
                      <tr key={`${item}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{item}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
              : (
                <p class="text-sm">
                  Generate checklist items to preview them here.
                </p>
              )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
