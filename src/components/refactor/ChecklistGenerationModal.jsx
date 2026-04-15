import Modal from "../Modal";

export default function ChecklistGenerationModal({ board }) {
  console.log("[DEBUG] ChecklistGenerationModal rendered - open:", board.checklistModalOpen);
  const {
    checklistModalOpen,
    checklistPrompt,
    checklistPreview,
    isGeneratingChecklist,
    checklistModalError,
    closeChecklistModal,
    setChecklistPrompt,
    generateChecklistItems,
    applyChecklistPreview,
  } = board;

  // Get placeholder from the task being edited (if any)
  const checklistPlaceholder = board.editTaskDraft?.title ||
    "Break down this task...";

  return (
    <Modal open={checklistModalOpen} onClose={closeChecklistModal}>
      <h3 class="text-xl font-semibold">
        What task do you want broken down?
      </h3>
      <div class="mt-4 space-y-4">
        <div class="space-y-2">
          <input
            class="w-full rounded border border-base-300 px-4 py-3 outline-none focus:border-cyan-500"
            type="text"
            value={checklistPrompt}
            placeholder={checklistPlaceholder}
            onInput={(e) => setChecklistPrompt(e.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                generateChecklistItems();
              }
              if (event.key === "Tab" && !checklistPrompt.trim()) {
                event.preventDefault();
                setChecklistPrompt(checklistPlaceholder);
              }
            }}
          />
          <p class="text-xs">
            Press Tab to fill the textbox with the task title placeholder.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded px-4 py-2 text-sm font-semibold transition"
            onClick={generateChecklistItems}
            disabled={isGeneratingChecklist}
          >
            {isGeneratingChecklist ? "Generating…" : "Generate Checklist Items"}
          </button>
          <button
            type="button"
            class="rounded px-4 py-2 text-sm font-semibold transition hover:"
            onClick={applyChecklistPreview}
            disabled={checklistPreview.length === 0}
          >
            Copy checklist items
          </button>
        </div>
        {checklistModalError && <p class="text-sm">{checklistModalError}</p>}
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
    </Modal>
  );
}
