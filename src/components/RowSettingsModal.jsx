import { useState } from "react";
import Modal from "./Modal.jsx";
import { useBoard } from "./context/useBoard.ts";

export default function RowSettingsModal({ row, open, onClose }) {
  const {
    renameRow,
    deleteRow,
    generateTasksForRow,
    isGeneratingTasks,
    taskGenerationStatus,
    taskGenerationIsError,
  } = useBoard();
  const [name, setName] = useState(row.name);
  const [prompt, setPrompt] = useState("");

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== row.name) renameRow(row.id, trimmed);
  };

  const handleDelete = () => {
    if (
      confirm(
        `Delete row "${row.name}"? \n\nThis will remove the "${row.name}" row. All columns and tasks will be removed.\n\nIt cannot be undone.`,
      )
    ) {
      deleteRow(row.id);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-semibold pr-10">{row.name} Settings</h2>

      <div className="mt-6 bg-base-200 p-5">
        <h3 className="text-lg font-semibold">Project name</h3>
        <form
          className="mt-4 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveName();
          }}
        >
          <input
            className="input input-secondary w-full"
            type="text"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onBlur={handleSaveName}
          />
          <button type="submit" className="btn btn-secondary w-fit">
            Save
          </button>
        </form>
      </div>

      <div className="mt-6 bg-base-200 p-5">
        <h3 className="text-lg font-semibold">Generate tasks with AI</h3>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            generateTasksForRow(row.id, prompt);
          }}
        >
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Prompt</legend>
            <input
              className="input input-secondary w-full"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              placeholder="Describe the tasks to generate"
              disabled={isGeneratingTasks}
            />
            <p className="label">
              Up to 10 tasks will be added to the Todo column
            </p>
          </fieldset>
          {!isGeneratingTasks && (
            <button
              className="btn btn-secondary w-fit"
              type="submit"
              disabled={!prompt.trim()}
            >
              Generate Tasks
            </button>
          )}
          {isGeneratingTasks && (
            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{taskGenerationStatus}</span>
            </div>
          )}
          {!isGeneratingTasks && taskGenerationStatus &&
            taskGenerationIsError && (
            <div role="alert" className="alert alert-error">
              <span className="iconify hugeicons--wifi-error-01 text-xl shrink-0" />
              <span>{taskGenerationStatus}</span>
            </div>
          )}
          {!isGeneratingTasks && taskGenerationStatus &&
            !taskGenerationIsError && (
            <div role="alert" className="alert alert-success">
              <span className="iconify hugeicons--add-to-list text-xl shrink-0" />
              <span>{taskGenerationStatus}</span>
            </div>
          )}
        </form>
      </div>

      <div className="mt-6 bg-base-200 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">D-D-D-Danger Zone</h3>
          <p className="text-sm">
            These are changes you cannot undo! Be careful.
          </p>
        </div>
        <button type="button" className="btn btn-error" onClick={handleDelete}>
          Delete Row
        </button>
      </div>
    </Modal>
  );
}
