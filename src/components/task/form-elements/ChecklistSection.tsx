import { useEffect, useId, useState } from "react";
import { beforeIdFromOrderedList, useDropTarget } from "@lib/dashboard/drag.ts";
import type { ChecklistItem, Task } from "../../context/types.ts";
import type { DragEvent } from "react";
import {
  handleChecklistKeyDown,
  useBoardRefs,
  useChecklistAIActions,
  useChecklistAIState,
} from "../../context/hooks.ts";

export default function ChecklistSection({
  checklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItem,
}: {
  checklist: ChecklistItem[];
  addChecklistItem: (focusNew?: boolean, insertBeforeIndex?: number) => void;
  updateChecklistItem: (
    id: string,
    field: string,
    value: string | boolean,
  ) => void;
  deleteChecklistItem: (id: string) => void;
  reorderChecklistItem: (itemId: string, beforeItemId: string | null) => void;
}) {
  const { setChecklistInputRef } = useBoardRefs();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { dropTarget, handleDragOver } = useDropTarget(!!draggedId);

  // The top item is always an empty entry row; committing it (Enter / blur /
  // Shift+Enter) spawns a fresh one above it. Re-checked on every checklist
  // change since the draft can be replaced after mount; skipped while the
  // entry row is focused so typing in it doesn't spawn rows.
  useEffect(() => {
    const top = checklist[0];
    const focusedId = document.activeElement?.closest("[data-checklist-item]")
      ?.getAttribute("data-checklist-item");
    if (top?.text !== "" && focusedId !== top?.id) {
      addChecklistItem(false, 0);
    }
  }, [checklist]);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const target = dropTarget;
    const moved = draggedId;
    setDraggedId(null);
    if (moved) {
      reorderChecklistItem(moved, beforeIdFromOrderedList(checklist, target));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] uppercase font-bold">
        Checklist items
      </p>
      <div className="space-y-3" onDrop={handleDrop}>
        {checklist.map((item, index) => (
          <div
            key={item.id}
            data-checklist-item={item.id}
            onDragOver={index === 0
              ? undefined
              : (e) => handleDragOver(e, item.id)}
            className="rounded flex items-center gap-1 bg-base-content/10 p-1"
            style={{
              opacity: draggedId === item.id ? 0.4 : 1,
              borderTop: `2px solid ${
                dropTarget?.id === item.id && dropTarget?.position === "before"
                  ? "var(--color-secondary)"
                  : "transparent"
              }`,
              borderBottom: `2px solid ${
                dropTarget?.id === item.id && dropTarget?.position === "after"
                  ? "var(--color-secondary)"
                  : "transparent"
              }`,
            }}
          >
            {index === 0 ? <span className="w-5 shrink-0"></span> : (
              <span
                draggable="true"
                onDragStart={() => setDraggedId(item.id)}
                onDragEnd={() => setDraggedId(null)}
                aria-label="Drag to reorder"
                className="iconify hugeicons--drag-drop-vertical text-xl shrink-0 cursor-grab text-base-content/50"
              >
              </span>
            )}
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
              data-testid="checklist-item-awaiting-input"
              value={item.text}
              onChange={(e) =>
                updateChecklistItem(
                  item.id,
                  "text",
                  e.currentTarget.value,
                )}
              onKeyDown={(e) => {
                if (index === 0 && e.key === "Enter") {
                  e.preventDefault();
                  if (item.text.trim()) addChecklistItem(true, 0);
                } else {
                  handleChecklistKeyDown(
                    e.nativeEvent,
                    index,
                    addChecklistItem,
                  );
                }
              }}
              onBlur={index === 0
                ? () => {
                  if (item.text.trim()) addChecklistItem(false, 0);
                }
                : undefined}
              ref={(el) => setChecklistInputRef(item.id, el)}
              placeholder="Shift+Enter for a new line, Enter to commit"
            />
            {index === 0
              ? <span className="btn-sm btn-square shrink-0 ml-auto"></span>
              : (
                <button
                  type="button"
                  onClick={() => deleteChecklistItem(item.id)}
                  aria-label="Delete checklist item"
                  className="btn btn-soft btn-error btn-sm btn-square shrink-0 ml-auto"
                >
                  <span className="iconify hugeicons--delete-02 text-xl">
                  </span>
                </button>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Reads ChecklistAI state itself so typing in the prompt re-renders only this
// collapse, not the whole task modal. `applyChecklist` differs per modal
// (create draft vs. edit draft).
export function ChecklistGenerationCollapse({
  taskDraft,
  applyChecklist,
}: {
  taskDraft: Task;
  applyChecklist: () => void;
}) {
  const {
    checklistPrompt,
    checklistPreview,
    isGeneratingChecklist,
    checklistModalError,
  } = useChecklistAIState();
  const { setChecklistPrompt, generateChecklistItems, clearChecklistPreview } =
    useChecklistAIActions();
  const [showError, setShowError] = useState(false);
  const promptId = useId();

  function tryGenerate() {
    if (!checklistPrompt.trim()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    generateChecklistItems(taskDraft);
  }

  const [collapseOpen, setCollapseOpen] = useState(true);

  return (
    <div
      id="checklist-gen-collapse"
      className={`collapse collapse-arrow bg-secondary/10 ${
        collapseOpen ? "collapse-open" : ""
      }`}
    >
      <button
        id="checklist-gen-collapse-toggle"
        type="button"
        className="collapse-title text-[12px] uppercase font-bold py-3 w-full text-left"
        onClick={() => setCollapseOpen(!collapseOpen)}
      >
        Generate checklist items with AI
      </button>
      <div
        id="checklist-gen-collapse-content"
        className="collapse-content space-y-4"
      >
        <div className="form-control">
          <fieldset className="fieldset">
            <label className="fieldset-legend" htmlFor={promptId}>
              What task do you need broken down into subtasks?
            </label>
            <input
              id={promptId}
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
            {showError && <p className="text-error text-sm mt-1">Required</p>}
          </fieldset>
        </div>
        {checklistModalError && (
          <p className="text-sm text-error">{checklistModalError}</p>
        )}
        <div className="overflow-x-auto">
          {checklistPreview.length > 0
            ? (
              <table className="bg-base-100 table table-sm w-full">
                <thead>
                  <tr>
                    <th className="text-left text-[12px] uppercase font-bold">
                      Checklist item preview
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {checklistPreview.map((item, index) => (
                    <tr
                      className="border border-base-100!"
                      key={`${item}-${index}`}
                    >
                      <td>{item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
            : (
              <p className="text-sm italic">
                Preview will generate here.
              </p>
            )}
        </div>
        <div className="flex flex-wrap gap-2">
          {checklistPreview.length > 0
            ? (
              <>
                <button
                  type="button"
                  className="btn btn-error btn-soft btn-sm"
                  onClick={clearChecklistPreview}
                >
                  <span className="iconify hugeicons--delete-02  text-lg">
                  </span>
                  Trash generated items
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={applyChecklist}
                >
                  <span className="iconify hugeicons--add-to-list text-lg">
                  </span>
                  Add items to checklist
                </button>
              </>
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
      </div>
    </div>
  );
}
