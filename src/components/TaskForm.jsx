import ChecklistSection, {
  ChecklistGenerationCollapse,
} from "./ChecklistSection.jsx";

export default function TaskForm({
  taskDraft,
  setTaskDraft,
  onSubmit,
  onCancel,
  submitLabel = "Create task",
  onDelete,
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
  applyChecklist,
  clearChecklistPreview,
  children,
}) {
  return (
    <form class="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Title</legend>
        <input
          class="input validator input-bordered w-full"
          type="text"
          value={taskDraft.title}
          onInput={(e) =>
            setTaskDraft({
              ...taskDraft,
              title: e.currentTarget.value,
            })}
          required
        />
        <span class="validator-hint hidden">Required</span>
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">Description</legend>
        <textarea
          class="textarea textarea-bordered w-full h-24"
          value={taskDraft.description}
          onInput={(e) =>
            setTaskDraft({
              ...taskDraft,
              description: e.currentTarget.value,
            })}
        />
        <p class="label">Optional</p>
      </fieldset>
      {children}
      <div class="grid grid-cols-2 gap-4 items-start">
        <ChecklistSection
          checklist={taskDraft.checklist}
          addChecklistItem={addChecklistItem}
          updateChecklistItem={updateChecklistItem}
          deleteChecklistItem={deleteChecklistItem}
          handleChecklistKeyDown={handleChecklistKeyDown}
          setChecklistInputRef={setChecklistInputRef}
        />
        <ChecklistGenerationCollapse
          taskDraft={taskDraft}
          checklistPrompt={checklistPrompt}
          checklistPreview={checklistPreview}
          isGeneratingChecklist={isGeneratingChecklist}
          checklistModalError={checklistModalError}
          setChecklistPrompt={setChecklistPrompt}
          generateChecklistItems={generateChecklistItems}
          applyChecklist={applyChecklist}
          clearChecklistPreview={clearChecklistPreview}
        />
      </div>
      <div class={`flex gap-2 ${onDelete ? "justify-between" : "justify-end"}`}>
        {onDelete && (
          <button
            type="button"
            class="btn btn-error btn-outline"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
        <div class="flex gap-2">
          {onCancel && (
            <button type="button" class="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" class="btn btn-success">
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
