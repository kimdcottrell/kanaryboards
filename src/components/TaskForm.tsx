import { useEffect, useRef, useState } from "react";
import { ExtensiveEditor } from "@lyfie/luthor";

const MD_TOOLBAR_LAYOUT = {
  sections: [
    { items: ["undo", "redo"] },
    {
      items: [
        "blockFormat",
        "quote",
        "alignLeft",
        "alignCenter",
        "alignRight",
        "alignJustify",
      ],
    },
    { items: ["bold", "italic", "strikethrough", "code", "link"] },
    {
      items: [
        "unorderedList",
        "orderedList",
        "checkList",
        "indentList",
        "outdentList",
      ],
    },
    { items: ["codeBlock", "horizontalRule", "table", "image"] },
    { items: ["themeToggle"] },
  ],
};

function useLuthorTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "kanary-night"
      ? "dark"
      : "light"
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(
        document.documentElement.getAttribute("data-theme") === "kanary-night"
          ? "dark"
          : "light",
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}

import ChecklistSection, {
  ChecklistGenerationCollapse,
} from "./ChecklistSection.tsx";

export default function TaskForm({
  taskDraft,
  setTaskDraft,
  onSubmit,
  onCancel,
  submitLabel = "Create task",
  onDelete,
  initialMode = "markdown",
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItem,
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
  const editorRef = useRef(null);
  const submitButtonRef = useRef(null);
  const luthorTheme = useLuthorTheme();
  function handleSubmit(e) {
    const submitter = e.nativeEvent?.submitter;
    if (submitter && submitter !== submitButtonRef.current) {
      e.preventDefault();
      return;
    }
    onSubmit(e, {
      json: editorRef.current?.getJSON() ?? "",
      markdown: editorRef.current?.getMarkdown() ?? "",
      html: editorRef.current?.getHTML() ?? "",
    });
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
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
        <div className="border border-base-content/20 rounded-lg overflow-hidden">
          <ExtensiveEditor
            defaultContent={taskDraft.description}
            onReady={(methods) => {
              editorRef.current = methods;
            }}
            initialTheme={luthorTheme}
            initialMode={initialMode}
            availableModes={["visual-only", "visual-editor", "markdown"]}
            markdownSourceOfTruth
            markdownBridgeFlavor="github"
            sourceMetadataMode="none"
            isListStyleDropdownEnabled={false}
            toolbarLayout={MD_TOOLBAR_LAYOUT}
            featureFlags={{ codeIntelligence: false, iframeEmbed: false }}
          />
        </div>
        <p className="label">Optional</p>
      </fieldset>
      {children}
      <div className="grid grid-cols-2 gap-4 items-start">
        <ChecklistSection
          checklist={taskDraft.checklist}
          addChecklistItem={addChecklistItem}
          updateChecklistItem={updateChecklistItem}
          deleteChecklistItem={deleteChecklistItem}
          reorderChecklistItem={reorderChecklistItem}
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
      <div
        className={`flex gap-2 ${onDelete ? "justify-between" : "justify-end"}`}
      >
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
          <button
            ref={submitButtonRef}
            type="submit"
            className="btn btn-success"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
