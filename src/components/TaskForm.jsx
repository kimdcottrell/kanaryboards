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
    <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Title</legend>
        <input
          className="input validator input-bordered w-full"
          type="text"
          value={taskDraft.title}
          onChange={(e) =>
            setTaskDraft({
              ...taskDraft,
              title: e.currentTarget.value,
            })}
          required
        />
        <span className="validator-hint hidden">Required</span>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Description</legend>
        <textarea
          className="textarea textarea-bordered w-full h-24"
          value={taskDraft.description}
          onChange={(e) =>
            setTaskDraft({
              ...taskDraft,
              description: e.currentTarget.value,
            })}
        />
        <p className="label">Optional</p>
      </fieldset>
      {children}
      <div className="grid grid-cols-2 gap-4 items-start">
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
      <div className={`flex gap-2 ${onDelete ? "justify-between" : "justify-end"}`}>
        {onDelete && (
          <button
            type="button"
            className="btn btn-error btn-outline"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-success">
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
