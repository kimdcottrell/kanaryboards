import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, SubmitEvent as ReactSubmitEvent } from "react";
import { ExtensiveEditor } from "@lyfie/luthor";
import type {
  CoreEditorMode,
  ExtensiveEditorRef,
  ToolbarLayout,
} from "@lyfie/luthor";
import type { ChecklistAIState, Column, Row, Task } from "./context/types.ts";
import { useLuthorTheme } from "./shared/useLuthorTheme.ts";
import { preventEdits } from "@lib/dashboard/view-only.ts";

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
  onTrash?: () => void;
  // View-only mode (a task in the Trash column): every field blocks edits and
  // the dock shows Delete + Cancel + Restore instead of Trash + Submit.
  readOnly?: boolean;
  onRestore?: () => void;
  onDelete?: () => void;
  // When provided (even as null while it mounts), the Trash/Cancel/Submit
  // buttons render into this element (e.g. a modal's docked footer) instead
  // of at the end of the form. The submit button stays tied to the form via
  // its `form` attribute.
  actionsContainer?: HTMLElement | null;
  // When provided (even as null while it mounts), the title input renders
  // into this element as an unlabeled, heading-styled field instead of a
  // labeled fieldset at the top of the form.
  titleContainer?: HTMLElement | null;
  initialMode?: CoreEditorMode;
  columns: Column[];
  rows: Row[];
  requireRowColumn?: boolean;
  addChecklistItem: (focusNew?: boolean, insertBeforeIndex?: number) => void;
  updateChecklistItem: (
    id: string,
    field: string,
    value: string | boolean,
  ) => void;
  deleteChecklistItem: (id: string) => void;
  reorderChecklistItem: (itemId: string, beforeItemId: string | null) => void;
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
  onTrash,
  readOnly = false,
  onRestore,
  onDelete,
  actionsContainer,
  titleContainer,
  initialMode = "markdown",
  columns,
  rows,
  requireRowColumn = false,
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
}: TaskFormProps) {
  const editorRef = useRef<ExtensiveEditorRef | null>(null);
  const submitButtonRef = useRef(null);
  const titleId = useId();
  const formId = useId();
  const luthorTheme = useLuthorTheme();
  const statusName = `column-select-${taskDraft.id || "new"}`;
  // Trash is only reachable via the Trash button or drag-and-drop. A trashed
  // task shows the column it will be restored to.
  const statusColumns = columns.filter((c) => !c.isTrash);
  const statusColId = readOnly ? taskDraft.preTrashColId : taskDraft.colId;
  const selectedColIndex = statusColumns.findIndex((c) => c.id === statusColId);
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);
  function handleSubmit(e: ReactSubmitEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent)?.submitter;
    if (submitter && submitter !== submitButtonRef.current) {
      e.preventDefault();
      return;
    }
    onSubmit(e.nativeEvent, {
      json: editorRef.current?.getJSON() ?? "",
      markdown: editorRef.current?.getMarkdown() ?? "",
      html: editorRef.current?.getHTML() ?? "",
    });
  }

  const trashButton = !readOnly && onTrash && (
    <button
      type="button"
      className="btn btn-error btn-outline"
      onClick={onTrash}
    >
      Trash
    </button>
  );
  const cancelButton = onCancel && (
    <button type="button" className="btn btn-ghost" onClick={onCancel}>
      Cancel
    </button>
  );
  const deleteButton = readOnly && onDelete && (
    <div className="tooltip tooltip-top" data-tip="There is no undo">
      <button
        type="button"
        className="btn btn-error btn-outline"
        onClick={onDelete}
      >
        Delete forever
      </button>
    </div>
  );
  const submitButton = readOnly
    ? (
      <button type="button" className="btn btn-success" onClick={onRestore}>
        Restore
      </button>
    )
    : (
      <button
        ref={submitButtonRef}
        type="submit"
        form={formId}
        className="btn btn-success"
      >
        {submitLabel}
      </button>
    );

  return (
    <form
      id={formId}
      className="mt-4 space-y-4"
      onSubmit={handleSubmit}
      noValidate
    >
      {titleContainer === undefined && (
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
            readOnly={readOnly}
            {...(readOnly ? preventEdits : {})}
          />
          <span className="validator-hint hidden">Required</span>
        </fieldset>
      )}
      {titleContainer &&
        createPortal(
          <input
            id={titleId}
            form={formId}
            aria-label="Title"
            className="input input-ghost validator w-full px-0 hover:border-base-content/50 text-2xl font-roboto-slab font-semibold"
            type="text"
            value={taskDraft.title}
            onChange={(e) =>
              setTaskDraft({
                ...taskDraft,
                title: e.currentTarget.value,
              })}
            required
            readOnly={readOnly}
            {...(readOnly ? preventEdits : {})}
          />,
          titleContainer,
        )}

      {readOnly && (
        <div
          role="alert"
          className="alert alert-error alert-soft border border-error w-full"
        >
          <span className="iconify hugeicons--alert-circle text-lg"></span>
          <span>
            Task is{" "}
            <strong className="font-extrabold">view-only</strong>. Restore it to
            edit.
          </span>
        </div>
      )}
      <div
        className="grid md:grid-cols-2 gap-4 items-start"
        {...(readOnly ? preventEdits : {})}
      >
        <fieldset className="fieldset">
          <div className="border border-base-content/20 rounded-lg overflow-hidden">
            <ExtensiveEditor
              className="task-description-editor"
              defaultContent={taskDraft.description}
              onReady={(methods) => {
                editorRef.current = methods;
              }}
              initialTheme={luthorTheme}
              initialMode={initialMode}
              availableModes={readOnly
                ? ["visual-only"]
                : ["visual-only", "visual-editor", "markdown"]}
              markdownSourceOfTruth
              markdownBridgeFlavor="github"
              sourceMetadataMode="none"
              isListStyleDropdownEnabled={false}
              toolbarLayout={MD_TOOLBAR_LAYOUT}
              featureFlags={{ codeIntelligence: false, iframeEmbed: false }}
            />
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-4 items-start md:col-span-2 md:order-first">
          <fieldset className="fieldset min-w-0">
            <legend className="fieldset-legend text-primary text-[12px] uppercase font-bold">
              Status
            </legend>
            <div className="overflow-x-auto">
              <div
                id={statusName}
                className="steps"
                onMouseLeave={() => setHoveredColIndex(null)}
              >
                {statusColumns.map((option, i) => {
                  const stepClass = hoveredColIndex === null
                    ? (i <= selectedColIndex ? " step-primary" : "")
                    : (i <= hoveredColIndex ? " step-preview" : "");
                  return (
                    <label
                      key={option.id}
                      data-testid={`status-step-${option.id}`}
                      className={`step relative cursor-pointer text-sm has-focus-visible:underline${stepClass}`}
                      style={{ "--step-index": i } as CSSProperties}
                      onMouseEnter={() => setHoveredColIndex(i)}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={statusName}
                        value={option.id}
                        checked={option.id === statusColId}
                        onChange={() => {
                          setHoveredColIndex(null);
                          setTaskDraft({ ...taskDraft, colId: option.id });
                        }}
                        required={requireRowColumn}
                      />
                      {option.title}
                    </label>
                  );
                })}
              </div>
            </div>
            {requireRowColumn && (
              <span className="validator-hint">Required</span>
            )}
          </fieldset>
          <fieldset className="fieldset min-w-0">
            {
              /* The current project is tinted with its row color
                (.row-menu-item in global.css). */
            }
            <ul
              id={`row-select-${taskDraft.id || "new"}`}
              className="menu w-full p-0"
            >
              <li>
                <legend className="p-0 fieldset-legend menu-title text-base-content text-[12px] uppercase font-bold">
                  Project
                </legend>
                <ul className="pt-2 mx-0">
                  {rows.map((option) => (
                    <li key={option.id}>
                      <label
                        className={`font-roboto-slab font-semibold row-menu-item has-focus-visible:underline${
                          option.id === taskDraft.rowId ? " menu-active" : ""
                        }`}
                        style={{
                          "--row-tint-color": option.color,
                        } as CSSProperties}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={`row-select-${taskDraft.id || "new"}`}
                          value={option.id}
                          checked={option.id === taskDraft.rowId}
                          onChange={() =>
                            setTaskDraft({ ...taskDraft, rowId: option.id })}
                          required={requireRowColumn}
                        />
                        {option.title}
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
            {requireRowColumn && (
              <span className="validator-hint">Required</span>
            )}
          </fieldset>
        </div>
        <div className="flex flex-col gap-4">
          <ChecklistSection
            checklist={taskDraft.checklist}
            addChecklistItem={addChecklistItem}
            updateChecklistItem={updateChecklistItem}
            deleteChecklistItem={deleteChecklistItem}
            reorderChecklistItem={reorderChecklistItem}
            handleChecklistKeyDown={handleChecklistKeyDown}
            setChecklistInputRef={setChecklistInputRef}
          />
          <div className="order-first md:order-0">
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
        </div>
      </div>
      {actionsContainer === undefined && (
        <div
          className={`flex gap-2 ${
            trashButton || deleteButton ? "justify-between" : "justify-end"
          }`}
        >
          {trashButton}
          {deleteButton}
          <div className="flex gap-2">
            {cancelButton}
            {submitButton}
          </div>
        </div>
      )}
      {actionsContainer &&
        createPortal(
          <>
            {trashButton}
            {deleteButton}
            {cancelButton}
            {submitButton}
          </>,
          actionsContainer,
        )}
    </form>
  );
}
