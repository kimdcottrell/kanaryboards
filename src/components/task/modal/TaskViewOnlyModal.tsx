import ExistingTaskModalWrapper, {
  useCloseTaskDetails,
} from "./ExistingTaskModalWrapper.tsx";
import TitleInput from "../form-elements/TitleInput.tsx";
import FieldsGrid from "./FieldsGrid.tsx";
import DescriptionEditor from "../form-elements/DescriptionEditor.tsx";
import StatusSteps from "../form-elements/StatusSteps.tsx";
import ProjectMenu from "../form-elements/ProjectMenu.tsx";
import ChecklistSection from "../form-elements/ChecklistSection.tsx";
import TaskComments from "../comments/TaskComments.tsx";
import { isTaskTrashed } from "@lib/dashboard/view-only.ts";
import {
  useBoardDataState,
  useTaskActions,
  useTaskEditActions,
  useTaskEditState,
} from "../../context/hooks.ts";

// A task in the Trash column. ExistingTaskModalWrapper's `viewOnly` blocks
// edits to everything but the dock (Delete forever / Cancel / Restore).
export default function TaskViewOnlyModal() {
  const { columns, rows } = useBoardDataState();
  const { taskEditModalOpen, editTaskDraft: draft } = useTaskEditState();
  const {
    addEditChecklistItem,
    updateEditChecklistItem,
    deleteEditChecklistItem,
    reorderEditChecklistItem,
  } = useTaskEditActions();
  const { restoreTask, deleteTask } = useTaskActions();
  const { close, closeAfter } = useCloseTaskDetails();

  if (!draft || !isTaskTrashed(draft, columns)) {
    return <ExistingTaskModalWrapper open={false} />;
  }

  return (
    <ExistingTaskModalWrapper
      open={taskEditModalOpen}
      viewOnly
      title={<TitleInput variant="heading" value={draft.title} readOnly />}
      comments={<TaskComments taskId={draft.id} />}
      actions={
        <>
          <div className="tooltip tooltip-top" data-tip="There is no undo">
            <button
              type="button"
              className="btn btn-error btn-outline"
              onClick={closeAfter(() => deleteTask(draft.id))}
            >
              Delete forever
            </button>
          </div>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={closeAfter(() => restoreTask(draft.id))}
          >
            Restore
          </button>
        </>
      }
    >
      <div className="mt-4 space-y-4">
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
        <FieldsGrid
          description={
            <DescriptionEditor
              defaultContent={draft.description}
              readOnly
            />
          }
          status={
            <StatusSteps
              taskId={draft.id}
              columns={columns}
              selectedColId={draft.preTrashColId}
            />
          }
          project={
            <ProjectMenu
              taskId={draft.id}
              rows={rows}
              selectedRowId={draft.rowId}
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
        />
      </div>
    </ExistingTaskModalWrapper>
  );
}
