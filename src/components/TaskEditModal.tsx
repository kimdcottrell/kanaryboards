import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./shared/Modal.tsx";
import ActionsDock from "./shared/ActionsDock.tsx";
import TaskForm from "./TaskForm.tsx";
import TaskComments from "./comments/TaskComments.tsx";
import { preventEdits } from "@lib/dashboard/view-only.ts";
import {
  handleChecklistKeyDown,
  useBoardDataState,
  useBoardRefs,
  useChecklistAIActions,
  useChecklistAIState,
  useTaskActions,
  useTaskEditActions,
  useTaskEditState,
} from "./context/hooks.ts";

export default function TaskEditModal() {
  const navigate = useNavigate();
  const { columns, rows } = useBoardDataState();
  const { taskEditModalOpen, editTaskDraft } = useTaskEditState();
  const {
    setEditTaskDraft,
    saveTaskEdit,
    addEditChecklistItem,
    updateEditChecklistItem,
    deleteEditChecklistItem,
    reorderEditChecklistItem,
  } = useTaskEditActions();
  const { cancelEditTask, trashTask, restoreTask, deleteTask } =
    useTaskActions();
  const { setChecklistInputRef } = useBoardRefs();
  const {
    checklistPrompt,
    checklistPreview,
    isGeneratingChecklist,
    checklistModalError,
  } = useChecklistAIState();
  const {
    setChecklistPrompt,
    generateChecklistItems,
    applyChecklistPreview,
    clearChecklistPreview,
  } = useChecklistAIActions();

  // State, not a ref: TaskForm must re-render once the dock exists so it can
  // portal its dock buttons (Trash/Cancel/Save, or Delete/Cancel/Restore for a
  // trashed task) into it.
  const [actionsDock, setActionsDock] = useState<HTMLDivElement | null>(null);
  const [titleSlot, setTitleSlot] = useState<HTMLDivElement | null>(null);

  // Tasks in the Trash column are view-only until restored.
  const isTrashed = !!editTaskDraft &&
    columns.some((c) => c.id === editTaskDraft.colId && c.isTrash);

  const handleClose = () => {
    cancelEditTask();
    navigate("/dashboard");
  };

  return (
    <Modal
      open={taskEditModalOpen}
      onClose={handleClose}
      boxClassName="md:overflow-hidden"
    >
      {
        /* Desktop: below the full-width title input, form (70%) and comments
          sidebar (30%) sit side by side, each scrolling on its own. The max
          height mirrors the modal box's max-h-11/12 minus its md:p-6
          padding. The form's buttons float in a centered dock over the
          bottom: pinned over the form column on desktop (whose md:pb-16
          keeps its end clear of it), sticky in the scrolling modal on mobile. Mobile: one column, comments after the form. */
      }
      <div className="grid md:grid-cols-[7fr_3fr] md:grid-rows-[auto_minmax(0,1fr)] md:relative md:gap-x-6 md:max-h-[calc(100dvh*11/12-3rem)]">
        <div ref={setTitleSlot} className="pr-10 md:col-span-2" />
        <div className="md:overflow-y-auto md:min-h-0 md:pr-2 md:pb-16">
          {editTaskDraft
            ? (
              <TaskForm
                taskDraft={editTaskDraft}
                actionsContainer={actionsDock}
                titleContainer={titleSlot}
                setTaskDraft={setEditTaskDraft}
                onSubmit={(e, content) => {
                  saveTaskEdit(e, content);
                  navigate("/dashboard");
                }}
                onCancel={handleClose}
                submitLabel="Save"
                initialMode="visual-only"
                onTrash={() => {
                  trashTask(editTaskDraft.id);
                  navigate("/dashboard");
                }}
                readOnly={isTrashed}
                onRestore={() => {
                  restoreTask(editTaskDraft.id);
                  navigate("/dashboard");
                }}
                onDelete={() => {
                  deleteTask(editTaskDraft.id);
                  navigate("/dashboard");
                }}
                addChecklistItem={addEditChecklistItem}
                updateChecklistItem={updateEditChecklistItem}
                deleteChecklistItem={deleteEditChecklistItem}
                reorderChecklistItem={reorderEditChecklistItem}
                handleChecklistKeyDown={handleChecklistKeyDown}
                setChecklistInputRef={setChecklistInputRef}
                checklistPrompt={checklistPrompt}
                checklistPreview={checklistPreview}
                isGeneratingChecklist={isGeneratingChecklist}
                checklistModalError={checklistModalError}
                setChecklistPrompt={setChecklistPrompt}
                generateChecklistItems={generateChecklistItems}
                applyChecklist={applyChecklistPreview}
                clearChecklistPreview={clearChecklistPreview}
                columns={columns}
                rows={rows}
              />
            )
            : <p className="mt-4 text-sm">Loading task...</p>}
        </div>
        {editTaskDraft && (
          <div className="contents" {...(isTrashed ? preventEdits : {})}>
            <TaskComments taskId={editTaskDraft.id} />
          </div>
        )}
        <ActionsDock
          ref={setActionsDock}
          className="md:absolute md:inset-x-0 md:bottom-0 md:mt-0"
        />
      </div>
    </Modal>
  );
}
