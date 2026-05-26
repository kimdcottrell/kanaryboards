import { useState } from "react";
import Modal from "./Modal.jsx";
import TaskForm from "./TaskForm.jsx";
import { useBoard } from "./context/useBoard.ts";

export default function TaskEditModal() {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const {
    taskEditModalOpen,
    editTaskDraft,
    columns,
    rows,
    cancelEditTask,
    saveTaskEdit,
    deleteTask,
    setEditTaskDraft,
    addEditChecklistItem,
    updateEditChecklistItem,
    deleteEditChecklistItem,
    handleChecklistKeyDown,
    setChecklistInputRef,
    checklistPrompt,
    checklistPreview,
    isGeneratingChecklist,
    checklistModalError,
    setChecklistPrompt,
    generateChecklistItems,
    applyChecklistPreview,
    clearChecklistPreview,
  } = useBoard();

  return (
    <Modal open={taskEditModalOpen} onClose={cancelEditTask}>
      <div className="flex gap-6 h-full min-h-0">
        <div className="flex-7 overflow-y-auto min-h-0">
          <h3 className="text-xl font-semibold">Edit task</h3>
          {editTaskDraft
            ? (
              <TaskForm
                taskDraft={editTaskDraft}
                setTaskDraft={setEditTaskDraft}
                onSubmit={saveTaskEdit}
                submitLabel="Save"
                initialMode="visual-only"
                onDelete={() => deleteTask(editTaskDraft.id)}
                addChecklistItem={addEditChecklistItem}
                updateChecklistItem={updateEditChecklistItem}
                deleteChecklistItem={deleteEditChecklistItem}
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
                          {option.name}
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
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                </div>
              </TaskForm>
            )
            : <p className="mt-4 text-sm">Loading task…</p>}
        </div>
        <div className="flex-3 border-l border-base-content/20 pl-6 flex flex-col min-h-0">
          <h3 className="text-xl font-semibold mb-4">Comments</h3>
          <div className="flex-1 overflow-y-auto min-h-0 mb-4">
            {comments.length === 0
              ? <p className="text-sm text-base-content/50">No comments yet.</p>
              : comments.map((c) => (
                <div key={c.id} className="chat chat-end">
                  <div className="chat-header">
                    You
                    <time className="text-xs opacity-50 ml-1">{c.time}</time>
                  </div>
                  <div className="chat-bubble whitespace-pre-wrap">
                    {c.text}
                  </div>
                  <div className="chat-footer opacity-50">Delivered</div>
                </div>
              ))}
          </div>
          <form
            className="mt-auto"
            onSubmit={(e) => {
              e.preventDefault();
              const text = commentText.trim();
              if (!text) return;
              const time = new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              setComments((
                prev,
              ) => [...prev, { id: crypto.randomUUID(), text, time }]);
              setCommentText("");
            }}
          >
            <textarea
              className="textarea textarea-bordered w-full resize-none"
              rows={3}
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form.requestSubmit();
                }
              }}
            />
            <div className="flex justify-end mt-2">
              <button type="submit" className="btn btn-sm btn-primary">
                Comment
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
