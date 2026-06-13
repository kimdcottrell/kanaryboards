import { useNavigate } from "react-router-dom";
import Modal from "./Modal.tsx";
import TaskForm from "./TaskForm.tsx";
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
  const { cancelEditTask, deleteTask } = useTaskActions();
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

  const handleClose = () => {
    cancelEditTask();
    navigate("/");
  };

  return (
    <Modal open={taskEditModalOpen} onClose={handleClose}>
      <h3 className="text-xl font-semibold">Edit task</h3>
      {editTaskDraft
        ? (
          <TaskForm
            taskDraft={editTaskDraft}
            setTaskDraft={setEditTaskDraft}
            onSubmit={(e, content) => {
              saveTaskEdit(e, content);
              navigate("/");
            }}
            submitLabel="Save"
            initialMode="visual-only"
            onDelete={() => {
              deleteTask(editTaskDraft.id);
              navigate("/");
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
          >
            <div className="grid grid-cols-2 gap-4 items-start">
              <fieldset className="fieldset">
                <legend
                  className="fieldset-legend"
                  htmlFor={`edit-column-select-${editTaskDraft.id}`}
                >
                  Status
                </legend>
                <select
                  id={`edit-column-select-${editTaskDraft.id}`}
                  className="select select-bordered w-full"
                  value={editTaskDraft.colId}
                  onChange={(e) =>
                    setEditTaskDraft({
                      ...editTaskDraft,
                      colId: e.currentTarget.value,
                    })}
                >
                  {columns.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend
                  className="fieldset-legend"
                  htmlFor={`edit-row-select-${editTaskDraft.id}`}
                >
                  Row
                </legend>
                <select
                  id={`edit-row-select-${editTaskDraft.id}`}
                  className="select select-bordered w-full"
                  value={editTaskDraft.rowId}
                  onChange={(e) =>
                    setEditTaskDraft({
                      ...editTaskDraft,
                      rowId: e.currentTarget.value,
                    })}
                >
                  {rows.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </fieldset>
            </div>
          </TaskForm>
        )
        : <p className="mt-4 text-sm">Loading task...</p>}
    </Modal>
  );
}
