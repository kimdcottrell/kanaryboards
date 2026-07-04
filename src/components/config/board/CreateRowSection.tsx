import { useRowFormActions, useRowFormState } from "../../context/hooks.ts";
import GeneratingTasksAlert from "../../shared/GeneratingTasksAlert.tsx";

export default function CreateRowSection() {
  const {
    newRowName,
    newRowPrompt,
    newRowFormKey,
    isGeneratingTasks,
    taskGenerationStatus,
  } = useRowFormState();
  const { setNewRowName, setNewRowPrompt, addRow } = useRowFormActions();

  return (
    <div
      data-testid="create-new-row"
      className=" bg-base-200 mt-6 p-2 md:p-3"
    >
      <h3 className="text-lg font-semibold mb-3">Create a new row</h3>
      <form
        key={newRowFormKey}
        className="space-y-3 mt-3"
        onSubmit={addRow}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Row name</legend>
            <input
              className="input  input-secondary w-full validator"
              type="text"
              value={newRowName}
              onChange={(e) => setNewRowName(e.currentTarget.value)}
              placeholder="A project name, a category for large project tasks, etc."
              disabled={isGeneratingTasks}
              required
            />
            <p className="validator-hint">Required</p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Generate tasks with AI{" "}
              <span className="text-base-content/50 font-normal">
                (optional)
              </span>
            </legend>
            <input
              id="newRowPrompt"
              className="input  input-secondary w-full"
              type="text"
              value={newRowPrompt}
              onChange={(e) => setNewRowPrompt(e.currentTarget.value)}
              placeholder="Describe the tasks to generate"
              disabled={isGeneratingTasks}
            />
            <p className="label">
              Up to 10 tasks will be added to the Todo column
            </p>
          </fieldset>
        </div>

        <div className="flex flex-col gap-3">
          {!isGeneratingTasks && (
            <button className="btn  btn-secondary w-fit" type="submit">
              Add Row
            </button>
          )}
          {isGeneratingTasks && (
            <GeneratingTasksAlert status={taskGenerationStatus} />
          )}
        </div>
      </form>
    </div>
  );
}
