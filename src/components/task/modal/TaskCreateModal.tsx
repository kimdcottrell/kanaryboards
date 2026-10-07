import { useId } from "react";
import Modal from "../../shared/Modal.tsx";
import ActionsDock from "./ActionsDock.tsx";
import TitleInput from "../form-elements/TitleInput.tsx";
import FieldsGrid from "./FieldsGrid.tsx";
import DescriptionEditor from "../form-elements/DescriptionEditor.tsx";
import StatusSteps from "../form-elements/StatusSteps.tsx";
import ProjectMenu from "../form-elements/ProjectMenu.tsx";
import ChecklistSection, {
  ChecklistGenerationCollapse,
} from "../form-elements/ChecklistSection.tsx";
import { useTaskFormSubmit } from "./useTaskFormSubmit.ts";
import {
  useBoardDataState,
  useChecklistAIActions,
  useTaskActions,
  useTaskCreateActions,
  useTaskCreateState,
} from "../../context/hooks.ts";

export default function TaskCreateModal() {
  const formId = useId();
  const { columns, rows } = useBoardDataState();
  const { taskCreateModalOpen, taskDraft: draft } = useTaskCreateState();
  const {
    setTaskDraft,
    createTask,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItem,
  } = useTaskCreateActions();
  const { closeTaskCreateModal } = useTaskActions();
  const { applyChecklistPreviewToDraft } = useChecklistAIActions();
  const { handleSubmit, submitButtonRef, onEditorReady } = useTaskFormSubmit(
    createTask,
  );

  return (
    <Modal open={taskCreateModalOpen} onClose={closeTaskCreateModal}>
      <h3 className="text-xl font-semibold">Add task</h3>
      <p className="text-sm text-base-content/70 mt-2">
        Create a new task in the selected column.
      </p>
      {taskCreateModalOpen && (
        <>
          <form
            id={formId}
            className="mt-4 space-y-4"
            onSubmit={handleSubmit}
            noValidate
          >
            <TitleInput
              variant="labeled"
              value={draft.title}
              onChange={(title) => setTaskDraft({ ...draft, title })}
            />
            <FieldsGrid
              description={
                <DescriptionEditor
                  defaultContent={draft.description}
                  initialMode="markdown"
                  onReady={onEditorReady}
                />
              }
              status={
                <StatusSteps
                  taskId={draft.id}
                  columns={columns}
                  selectedColId={draft.colId}
                  onSelect={(colId) => setTaskDraft({ ...draft, colId })}
                  required
                />
              }
              project={
                <ProjectMenu
                  taskId={draft.id}
                  rows={rows}
                  selectedRowId={draft.rowId}
                  onSelect={(rowId) => setTaskDraft({ ...draft, rowId })}
                  required
                />
              }
              checklist={
                <ChecklistSection
                  checklist={draft.checklist}
                  addChecklistItem={addChecklistItem}
                  updateChecklistItem={updateChecklistItem}
                  deleteChecklistItem={deleteChecklistItem}
                  reorderChecklistItem={reorderChecklistItem}
                />
              }
              checklistGeneration={
                <ChecklistGenerationCollapse
                  taskDraft={draft}
                  applyChecklist={applyChecklistPreviewToDraft}
                />
              }
            />
          </form>
          <ActionsDock>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={closeTaskCreateModal}
            >
              Cancel
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              form={formId}
              className="btn btn-success"
            >
              Create task
            </button>
          </ActionsDock>
        </>
      )}
    </Modal>
  );
}
