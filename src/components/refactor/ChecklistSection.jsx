import { useState } from "preact/hooks";

export default function ChecklistSection({
  checklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  handleChecklistKeyDown,
  setChecklistInputRef,
}) {
  console.log("[DEBUG] ChecklistSection rendered - items:", checklist.length);
  return (
    <div class="space-y-3 rounded border border-base-300 p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold">
          Checklist items
        </p>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          onClick={() => addChecklistItem(true)}
        >
          Add item
        </button>
      </div>
      <div class="space-y-3">
        {checklist.map((item, index) => (
          <div
            key={item.id}
            class="flex items-center gap-3 rounded border border-base-300 px-3 py-2"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onInput={() =>
                updateChecklistItem(
                  item.id,
                  "checked",
                  !item.checked,
                )}
              class="checkbox checkbox-sm"
            />
            <input
              class="input input-ghost input-sm grow"
              type="text"
              value={item.text}
              onInput={(e) =>
                updateChecklistItem(
                  item.id,
                  "text",
                  e.currentTarget.value,
                )}
              onKeyDown={(e) =>
                handleChecklistKeyDown(
                  e,
                  index,
                  addChecklistItem,
                )}
              ref={(el) => setChecklistInputRef(item.id, el)}
              placeholder="Type checklist item and press Shift+Enter to add more"
            />
            <button
              type="button"
              class="btn btn-ghost btn-sm text-error"
              onClick={() => deleteChecklistItem(item.id)}
              title="Delete checklist item"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChecklistGenerationCollapse({
  taskDraft,
  checklistPrompt,
  checklistPreview,
  isGeneratingChecklist,
  checklistModalError,
  setChecklistPrompt,
  generateChecklistItems,
  applyChecklist,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div class="collapse collapse-arrow border border-base-300">
      <input
        type="checkbox"
        checked={open}
        onChange={(e) => setOpen(e.currentTarget.checked)}
      />
      <div class="collapse-title font-semibold text-sm py-3">
        Generate checklist items with AI
      </div>
      <div class="collapse-content space-y-4">
        <div class="form-control">
          <input
            class="input input-bordered w-full"
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
          <label class="label">
            <span class="label-text-alt">
              Press Tab to fill with the task title, or Enter to generate.
            </span>
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            onClick={() => generateChecklistItems(taskDraft)}
            disabled={isGeneratingChecklist}
          >
            {isGeneratingChecklist ? "Generating…" : "Generate Checklist Items"}
          </button>
          <button
            type="button"
            class="btn btn-outline btn-sm"
            onClick={applyChecklist}
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
            : <p class="text-sm">Generate checklist items to preview them here.</p>}
        </div>
      </div>
    </div>
  );
}
