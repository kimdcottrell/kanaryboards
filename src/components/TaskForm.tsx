import { useEffect, useId, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { ExtensiveEditor } from "@lyfie/luthor";
import type {
  CoreEditorMode,
  CoreTheme,
  ExtensiveEditorRef,
  ToolbarLayout,
} from "@lyfie/luthor";
import type { ChecklistAIState, Task } from "./context/types.ts";

const MD_TOOLBAR_LAYOUT: ToolbarLayout = {
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

function useLuthorTheme(): CoreTheme {
  const [theme, setTheme] = useState((): CoreTheme =>
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

type EditorContent = { json: string; markdown: string; html: string };

// This interface is a view contract (React handlers, DOM events, children), so
// it lives with the component rather than in context/types.ts. That module is
// the framework-agnostic board state + reducer-action domain; mixing props in
// would force a React dependency into it and break its convention (no *Props
// interfaces there). The shared *data* it owns — Task, and the ChecklistAIState
// slice forwarded below via Pick — is imported instead of redeclared here.
interface TaskFormProps extends
  PropsWithChildren,
  Pick<
    ChecklistAIState,
    | "checklistPrompt"
    | "checklistPreview"
    | "isGeneratingChecklist"
    | "checklistModalError"
  > {
  taskDraft: Task;
  setTaskDraft: (draft: Task) => void;
  onSubmit: (event: Event, content?: EditorContent) => void;
  onCancel?: () => void;
  submitLabel?: string;
  onDelete?: () => void;
  initialMode?: CoreEditorMode;
  addChecklistItem: (focusNew?: boolean, insertBeforeIndex?: number) => void;
  updateChecklistItem: (
    id: string,
    field: string,
    value: string | boolean,
  ) => void;
  deleteChecklistItem: (id: string) => void;
  reorderChecklistItem?: (itemId: string, beforeItemId: string | null) => void;
  handleChecklistKeyDown: (
    event: KeyboardEvent,
    index: number,
    addItemFn: (focusNew: boolean, insertBeforeIndex?: number) => void,
  ) => void;
  setChecklistInputRef: (id: string, el: HTMLInputElement | null) => void;
  setChecklistPrompt: (prompt: string) => void;
  generateChecklistItems: (task?: Task) => void;
  applyChecklist: () => void;
  clearChecklistPreview: () => void;
}

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
}: TaskFormProps) {
  const editorRef = useRef<ExtensiveEditorRef | null>(null);
  const submitButtonRef = useRef(null);
  const titleId = useId();
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
        <label className="fieldset-legend" htmlFor={titleId}>Title</label>
        <input
          id={titleId}
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
        <label className="fieldset-legend">Description</label>
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
