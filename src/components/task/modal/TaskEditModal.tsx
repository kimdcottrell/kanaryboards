import { useId } from "react";
import ExistingTaskModalWrapper, {
  useCloseTaskDetails,
} from "./ExistingTaskModalWrapper.tsx";
import TitleInput from "../form-elements/TitleInput.tsx";
import FieldsGrid from "./FieldsGrid.tsx";
import DescriptionEditor from "../form-elements/DescriptionEditor.tsx";
import StatusSteps from "../form-elements/StatusSteps.tsx";
import ProjectMenu from "../form-elements/ProjectMenu.tsx";
import ChecklistSection, {
  ChecklistGenerationCollapse,
} from "../form-elements/ChecklistSection.tsx";
import TaskComments from "../comments/TaskComments.tsx";
import { useTaskFormSubmit } from "./useTaskFormSubmit.ts";
import PostEditPreSaveAlert from "./PostEditPreSaveAlert.tsx";
import {
  clearEditDraft,
  editableFields,
  readEditDraft,
  writeEditDraft,
} from "../editDraftStore.ts";
import { isTaskTrashed } from "@lib/dashboard/view-only.ts";
import {
  useBoardDataState,
  useChecklistAIActions,
  useTaskActions,
  useTaskEditActions,
  useTaskEditState,
} from "../../context/hooks.ts";

export default function TaskEditModal() {
  const formId = useId();
  const { columns, rows, tasks } = useBoardDataState();
  const { taskEditModalOpen, editTaskDraft: draft } = useTaskEditState();
  const {
    setEditTaskDraft,
    saveTaskEdit,
    addEditChecklistItem,
    updateEditChecklistItem,
    deleteEditChecklistItem,
    reorderEditChecklistItem,
  } = useTaskEditActions();
  const { trashTask } = useTaskActions();
  const { applyChecklistPreview } = useChecklistAIActions();
  const { close, closeAfter } = useCloseTaskDetails();
  const { handleSubmit, submitButtonRef, onEditorReady, getDescription } =
    useTaskFormSubmit(closeAfter(saveTaskEdit));

  // Trashed tasks open in TaskViewOnlyModal instead.
  const isTrashed = isTaskTrashed(draft, columns);

  if (!draft || isTrashed) {
    return (
      <ExistingTaskModalWrapper open={taskEditModalOpen && !isTrashed}>
        {!draft && <p className="mt-4 text-sm">Loading task...</p>}
      </ExistingTaskModalWrapper>
    );
  }

  // Closing without saving keeps any changes for next time; changes that
  // match the saved task are dropped instead.
  function closeWithStash() {
    const saved = tasks.find((t) => t.id === draft!.id);
    if (saved) {
      const current = {
        ...draft!,
        description: getDescription() ?? draft!.description,
      };
      const fields = editableFields(current);
      const stored = readEditDraft(current.id);
      if (fields === editableFields(saved)) clearEditDraft(current.id);
      else if (!stored || editableFields(stored.draft) !== fields) {
        writeEditDraft(current);
      }
    }
    close();
  }

  return (
    <ExistingTaskModalWrapper
      open={taskEditModalOpen}
      onClose={closeWithStash}
      alert={<PostEditPreSaveAlert taskId={draft.id} />}
      title={
        <TitleInput
          variant="heading"
          form={formId}
          value={draft.title}
          onChange={(title) => setEditTaskDraft({ ...draft, title })}
        />
      }
      comments={<TaskComments taskId={draft.id} />}
      actions={
        <>
          <button
            type="button"
            className="btn btn-error btn-outline"
            onClick={closeAfter(() => trashTask(draft.id))}
          >
            Trash
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={closeWithStash}
          >
            Cancel
          </button>
          <button
            ref={submitButtonRef}
            type="submit"
            form={formId}
            className="btn btn-success"
          >
            Save
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="mt-4 space-y-4"
        onSubmit={handleSubmit}
        noValidate
      >
        <FieldsGrid
          description={
            <DescriptionEditor
              defaultContent={draft.description}
              onReady={onEditorReady}
            />
          }
          status={
            <StatusSteps
              taskId={draft.id}
              columns={columns}
              selectedColId={draft.colId}
              onSelect={(colId) => setEditTaskDraft({ ...draft, colId })}
            />
          }
          project={
            <ProjectMenu
              taskId={draft.id}
              rows={rows}
              selectedRowId={draft.rowId}
              onSelect={(rowId) => setEditTaskDraft({ ...draft, rowId })}
              required
            />
          }
          checklist={
            <ChecklistSection
              checklist={draft.checklist}
              addChecklistItem={addEditChecklistItem}
              updateChecklistItem={updateEditChecklistItem}
              deleteChecklistItem={deleteEditChecklistItem}
              reorderChecklistItem={reorderEditChecklistItem}
            />
          }
          checklistGeneration={
            <ChecklistGenerationCollapse
              taskDraft={draft}
              applyChecklist={applyChecklistPreview}
            />
          }
        />
      </form>
    </ExistingTaskModalWrapper>
  );
}
