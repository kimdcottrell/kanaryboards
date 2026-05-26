import { useState } from "react";
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
    <div className="space-y-3 rounded bg-base-content/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          Checklist items
        </p>

        <button
          type="button"
          data-tip="Add checklist item"
          className="tooltip btn text-base-100 btn-info btn-sm btn-square text-md transition"
          onClick={() => addChecklistItem(true)}
        >
          <span className="iconify hugeicons--layer-add text-xl">
          </span>
        </button>
      </div>
      <div className="space-y-3">
        {checklist.map((item, index) => (
          <div
            key={item.id}
            className="rounded flex items-center gap-3 bg-base-content/10 px-3 py-2"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() =>
                updateChecklistItem(
                  item.id,
                  "checked",
                  !item.checked,
                )}
              className="checkbox bg-secondary checked:bg-secondary checked:text-base-100 checkbox-sm shrink-0"
            />
            <input
              className="input w-10/12 mx-auto"
              type="text"
              value={item.text}
              onChange={(e) =>
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
              className="shrink-0 ml-auto"
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
      id="checklist-gen-collapse"
      className={`collapse collapse-arrow bg-base-content/10 ${
        collapseOpen ? "collapse-open" : ""
      }`}
    >
      <button
        id="checklist-gen-collapse-toggle"
        type="button"
        className="collapse-title font-semibold text-sm py-3 w-full text-left"
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
      <div
        id="checklist-gen-collapse-content"
        className="collapse-content space-y-4"
      >
        <div className="form-control">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              What task do you need broken down into subtasks?
            </legend>
            <input
              className="input input-bordered w-full"
              type="text"
              value={checklistPrompt}
              placeholder={taskDraft?.title || "Break down this task..."}
              onChange={(e) => {
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
            {showError && (
              <div role="alert" className="alert alert-error mt-1 py-2">
                <span className="text-sm">Required</span>
              </div>
            )}
          </fieldset>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={applyChecklist}
            disabled={checklistPreview.length === 0}
          >
            <span className="iconify hugeicons--arrow-left-big text-lg">
            </span>
            Copy checklist items to task
          </button>

          {checklistPreview.length > 0
            ? (
              <button
                type="button"
                className="btn btn-warning btn-sm"
                onClick={clearChecklistPreview}
              >
                <span className="iconify basil--trash-outline text-lg"></span>
                Empty generated items
              </button>
            )
            : (
              <button
                type="button"
                className="btn btn-info btn-sm"
                onClick={tryGenerate}
                disabled={isGeneratingChecklist}
              >
                <span className="iconify hugeicons--magic-wand-03 text-lg">
                </span>
                {isGeneratingChecklist
                  ? "Generating…"
                  : "Generate Checklist Items"}
              </button>
            )}
        </div>
        {checklistModalError && (
          <div role="alert" className="alert alert-error">
            <span className="iconify hugeicons--wifi-error-01 text-xl shrink-0" />
            <span>{checklistModalError}</span>
          </div>
        )}
        <div className="overflow-x-auto">
          {checklistPreview.length > 0
            ? (
              <table className="bg-base-content/10 table w-full">
                <thead>
                  <tr>
                    <th className="pe-0"></th>
                    <th className="text-left ps-0">Checklist item preview</th>
                  </tr>
                </thead>
                <tbody>
                  {checklistPreview.map((item, index) => (
                    <tr
                      className="border border-base-100!"
                      key={`${item}-${index}`}
                    >
                      <td className="pe-0">
                        <input
                          type="checkbox"
                          className="checkbox bg-base-300"
                          disabled
                        />
                      </td>
                      <td className="ps-0">{item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
            : (
              <p className="text-sm">
                Generate checklist items to preview them here.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
