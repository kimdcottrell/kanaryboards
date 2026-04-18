import { rowColorOptions } from "./store.ts";

export default function BoardConfiguration({ board }) {
  console.log("[DEBUG] BoardConfiguration rendered");
  const {
    rows,
    defaultColumnNames,
    newRowName,
    newRowPrompt,
    isGeneratingTasks,
    taskGenerationStatus,
    defaultColumnInput,
    editingRowId,
    editingRowName,
    draggedDefaultIndex,
    // Setters
    setNewRowName,
    setNewRowPrompt,
    setDefaultColumnInput,
    setEditingRowName,
    setDraggedDefaultIndex,
    // Handlers
    addRow,
    handleDefaultColumnInputKeyDown,
    handleDefaultColumnDragStart,
    handleDefaultColumnDragOver,
    handleDefaultColumnDrop,
    removeDefaultColumn,
    updateRowColor,
    moveRowUp,
    moveRowDown,
    confirmResetBoard,
    editRowTitle,
    saveRowTitle,
    deleteRow,
    handleNewRowPromptKeyDown,
  } = board;

  return (
    <section class="rounded bg-base-300 p-4 shadow-xl shadow-base-300/20">
      <div class="navbar flex justify-between items-start gap-4">
        <div class="">
          <h2 class="text-3xl font-semibold">Board Configuration</h2>
          <p class="mt-3 max-w-2xl">
            Add rows and columns, then place tasks into each column. Each task
            can include a title, description, and optional checklist.
          </p>
        </div>
        <div class="">
          <button
            type="button"
            class="btn btn-error btn"
            onClick={confirmResetBoard}
          >
            Reset Board
          </button>
        </div>
      </div>

      <div class="rounded mt-6 bg-base-200 p-5">
        <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-lg font-semibold">
              Default column settings
            </h3>
            <p class="text-sm">
              Manage the default column set used across projects. Drag badges to
              reorder, click x to remove, or add a new default column.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-baseline gap-2">
          {defaultColumnNames.map((name, index) => (
            <div class="join" key={name}>
              <button
                draggable="true"
                onDragStart={handleDefaultColumnDragStart(index)}
                onDragOver={handleDefaultColumnDragOver}
                onDrop={handleDefaultColumnDrop(index)}
                onDragEnd={() => setDraggedDefaultIndex(null)}
                class="btn join-item btn-accent cursor-grab"
              >
                {name}
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  removeDefaultColumn(name);
                }}
                class="btn join-item btn-accent btn-soft border-accent"
              >
                <span class="iconify basil--cross-outline text-xl font-bold">
                </span>
              </button>
            </div>
          ))}
          <fieldset class="fieldset">
            <input
              class="input input-accent"
              type="text"
              value={defaultColumnInput}
              onInput={(e) => setDefaultColumnInput(e.currentTarget.value)}
              onKeyDown={handleDefaultColumnInputKeyDown}
              placeholder="Add new column"
            />
            <p class="label">Hit enter to create</p>
          </fieldset>
        </div>
      </div>

      <div class="rounded bg-base-200 mt-6 p-5">
        <h3 class="text-lg font-semibold">Create a new row</h3>
        <form class="space-y-4" onSubmit={addRow}>
          <fieldset class="fieldset w-auto">
            <label class="fieldset-legend">
              What should the row be named?
            </label>
            <input
              class="input input-secondary w-full validator"
              type="text"
              value={newRowName}
              onInput={(e) => setNewRowName(e.currentTarget.value)}
              placeholder="A project name, a category for large project tasks, etc."
              required
            />
            <span class="validator-hint hidden">Required</span>

            <label class="fieldset-legend" htmlFor="newRowPrompt">
              Generate up to 10 tasks using AI
            </label>
            <input
              id="newRowPrompt"
              class="input w-full input-secondary"
              type="text"
              value={newRowPrompt}
              onInput={(e) => setNewRowPrompt(e.currentTarget.value)}
              onKeyDown={handleNewRowPromptKeyDown}
              placeholder="Enter a brief description of tasks to generate"
            />
          </fieldset>
          <div class="flex flex-col gap-3">
            <button
              class="btn btn-secondary mt-4"
              type="submit"
              disabled={isGeneratingTasks}
            >
              {isGeneratingTasks && <span class="loading loading-spinner loading-sm"></span>}
              {isGeneratingTasks ? taskGenerationStatus : "Add Row"}
            </button>
            {isGeneratingTasks && (
              <div class="alert alert-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  class="stroke-current shrink-0 w-6 h-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span>{taskGenerationStatus}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      <div class="mt-6 rounded bg-base-200 p-5">
        <div class="mb-4 flex flex-col gap-4 flex-row items-baseline justify-between">
          <div>
            <h3 class="text-lg font-semibold">
              Row settings
            </h3>
            <p class="text-sm">
              Use the arrow buttons to move rows up or down and pick a color for
              each project row.
            </p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <ul class="list bg-base-100 rounded space-y-2 shadow-md">
            {rows.map((row, index) => (
              <li
                key={row.id}
                class="grid grid-cols-3 list-row gap-3 border"
                style={{
                  backgroundColor: `${row.color}22`,
                  borderColor: row.color,
                }}
              >
                <div>
                  <h4 class="font-bold text-md">{row.name}</h4>
                </div>
                <div>
                  <select
                    class="max-w-xs rounded border px-3 py-1 text-sm outline-none"
                    style={{ borderColor: row.color }}
                    value={row.color}
                    onChange={(e) =>
                      updateRowColor(row.id, e.currentTarget.value)}
                  >
                    {rowColorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div class="flex items-end gap-2">
                  <button
                    type="button"
                    class={`btn btn-square btn-ghost ${
                      index === 0 ? "hidden" : ""
                    }`}
                    style={{ color: row.color, borderColor: row.color }}
                    disabled={index === 0}
                    onClick={() => moveRowUp(index)}
                    aria-label={`Move ${row.name} up`}
                  >
                    ⌃
                  </button>
                  <button
                    type="button"
                    class={`btn btn-square btn-ghost ${
                      index === rows.length - 1 ? "hidden" : ""
                    }`}
                    style={{ color: row.color, borderColor: row.color }}
                    disabled={index === rows.length - 1}
                    onClick={() => moveRowDown(index)}
                    aria-label={`Move ${row.name} down`}
                  >
                    ⌄
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
