import { useState } from "preact/hooks";
import CloseButton from "./buttons/CloseButton.tsx";

export default function ChecklistSection({
  checklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  handleChecklistKeyDown,
  setChecklistInputRef,
}) {
  return (
    <div class="space-y-3 rounded bg-base-content/10 p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold">
          Checklist items
        </p>

        <button
          type="button"
          data-tip="Add checklist item"
          class="tooltip btn text-base-100 btn-info btn-sm btn-square text-md transition"
          onClick={() => addChecklistItem(true)}
        >
          <span class="iconify hugeicons--layer-add text-xl">
          </span>
        </button>
      </div>
      <div class="space-y-3">
        {checklist.map((item, index) => (
          <div
            key={item.id}
            class="rounded flex items-center gap-3 bg-base-content/10 px-3 py-2"
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
              class="checkbox bg-secondary checked:bg-secondary checked:text-base-100 checkbox-sm shrink-0"
            />
            <input
              class="input w-10/12 mx-auto"
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
              placeholder="Shift+Enter to add more"
            />
            <CloseButton
              onClick={() => deleteChecklistItem(item.id)}
              aria-label="Delete checklist item"
              class="shrink-0 ml-auto"
            />
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
  clearChecklistPreview,
}) {
  const [showError, setShowError] = useState(false);

  function tryGenerate() {
    if (!checklistPrompt.trim()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    generateChecklistItems(taskDraft);
  }

  const [collapseOpen, setCollapseOpen] = useState(false);

  return (
    <div
      class={`collapse collapse-arrow bg-base-content/10 ${
        collapseOpen ? "collapse-open" : ""
      }`}
    >
      <button
        type="button"
        class="collapse-title font-semibold text-sm py-3 w-full text-left"
        onClick={() => {
          const opening = !collapseOpen;
          setCollapseOpen(opening);
          if (opening && !checklistPrompt.trim() && taskDraft?.title) {
            setChecklistPrompt(taskDraft.title);
          }
        }}
      >
        Generate checklist items with AI
      </button>
      <div class="collapse-content space-y-4">
        <div class="form-control">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              What task do you need broken down into subtasks?
            </legend>
            <input
              class="input input-bordered w-full"
              type="text"
              value={checklistPrompt}
              placeholder={taskDraft?.title || "Break down this task..."}
              onInput={(e) => {
                setChecklistPrompt(e.currentTarget.value);
                if (e.currentTarget.value.trim()) setShowError(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  tryGenerate();
                }
              }}
            />
            {showError && <p class="text-error text-sm mt-1">Required</p>}
          </fieldset>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-success btn-sm"
            onClick={applyChecklist}
            disabled={checklistPreview.length === 0}
          >
            <span class="iconify hugeicons--arrow-left-big text-lg">
            </span>
            Copy checklist items to task
          </button>

          {checklistPreview.length > 0
            ? (
              <button
                type="button"
                class="btn btn-warning btn-sm"
                onClick={clearChecklistPreview}
              >
                <span class="iconify basil--trash-outline text-lg"></span>
                Empty generated items
              </button>
            )
            : (
              <button
                type="button"
                class="btn btn-info btn-sm"
                onClick={tryGenerate}
                disabled={isGeneratingChecklist}
              >
                <span class="iconify hugeicons--magic-wand-03 text-lg"></span>
                {isGeneratingChecklist
                  ? "Generating…"
                  : "Generate Checklist Items"}
              </button>
            )}
        </div>
        {checklistModalError && (
          <p class="text-sm text-error">{checklistModalError}</p>
        )}
        <div class="overflow-x-auto">
          {checklistPreview.length > 0
            ? (
              <table class="bg-base-content/10 table w-full">
                <thead>
                  <tr>
                    <th class="pe-0"></th>
                    <th class="text-left ps-0">Checklist item preview</th>
                  </tr>
                </thead>
                <tbody>
                  {checklistPreview.map((item, index) => (
                    <tr
                      class="border border-base-100!"
                      key={`${item}-${index}`}
                    >
                      <td class="pe-0">
                        <input
                          type="checkbox"
                          class="checkbox bg-base-300"
                          disabled
                        />
                      </td>
                      <td class="ps-0">{item}</td>
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
  );
}
