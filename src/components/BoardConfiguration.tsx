import { useState } from "react";
import { useBoard } from "./context/useBoard.ts";
import { rowColorOptions } from "./context/constants.ts";

export default function BoardConfiguration() {
  const {
    rows,
    columns,
    newRowName,
    newRowPrompt,
    newRowFormKey,
    isGeneratingTasks,
    taskGenerationStatus,
    defaultColumnInput,
    draggedDefaultIndex,
    setNewRowName,
    setNewRowPrompt,
    setDefaultColumnInput,
    setDraggedDefaultIndex,
    addRow,
    handleDefaultColumnInputKeyDown,
    handleDefaultColumnDragStart,
    handleDefaultColumnDragOver,
    handleDefaultColumnDrop,
    deleteColumn,
    updateRowColor,
    moveRowUp,
    moveRowDown,
    renameRow,
    confirmResetBoard,
  } = useBoard();

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [dragHoverIndex, setDragHoverIndex] = useState(null);

  const startRowEdit = (row) => {
    setEditId(row.id);
    setEditName(row.title);
  };

  const saveRowEdit = () => {
    if (editId) renameRow(editId, editName);
    setEditId(null);
    setEditName("");
  };

  const cancelRowEdit = () => {
    setEditId(null);
    setEditName("");
  };

  return (
    <div className="grid">
      <section
        id="board-config"
        className="max-w-11/12 mt-16 place-self-center collapse collapse-arrow mb-16 bg-base-300 p-4 shadow-xl shadow-base-300/20"
      >
        <input
          id="board-config-collapse-toggle"
          type="checkbox"
          className="peer"
        />
        <div id="board-config-collapse-title" className="collapse-title">
          <h2 className="text-3xl font-semibold">
            Board Configuration
          </h2>
        </div>
        <div id="board-config-collapse-content" className="collapse-content">
          <p className="mt-3">
            Add rows and columns, then place tasks into each column. Each task
            can include a title, description, and optional checklist.
          </p>
          <div
            id="board-config-create-new-row"
            className=" bg-base-200 mt-6 p-5"
          >
            <h3 className="text-lg font-semibold">Create a new row</h3>
            <form
              key={newRowFormKey}
              className="space-y-4 mt-4"
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
                      >
                      </path>
                    </svg>
                    <span>{taskGenerationStatus}</span>
                  </div>
                )}
              </div>
            </form>
          </div>
          <div
            id="board-config-column-settings"
            className="mt-6 bg-base-200 p-5"
          >
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Column settings
                </h3>
                <p className="text-sm">
                  Manage the columns set used across projects. Drag badges to
                  reorder, click x to remove, or add a new default column.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              {columns.map((column, index) => {
                const isDraggingThis = draggedDefaultIndex === index;
                const isHovered = dragHoverIndex === index &&
                  draggedDefaultIndex !== null &&
                  draggedDefaultIndex !== index;
                const dropFromLeft = draggedDefaultIndex !== null &&
                  draggedDefaultIndex < index;
                return (
                  <div
                    key={column.id}
                    className="relative"
                    draggable="true"
                    onDragStart={handleDefaultColumnDragStart(index)}
                    onDragOver={(e) => {
                      handleDefaultColumnDragOver(e);
                      setDragHoverIndex(index);
                    }}
                    onDrop={(e) => {
                      handleDefaultColumnDrop(column.id)(e);
                      setDragHoverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedDefaultIndex(null);
                      setDragHoverIndex(null);
                    }}
                    style={{ opacity: isDraggingThis ? 0.4 : 1 }}
                  >
                    {isHovered && !dropFromLeft && (
                      <span
                        className="absolute inset-y-0 w-0.5 bg-secondary"
                        style={{ left: "-0.30rem" }}
                      />
                    )}
                    {isHovered && dropFromLeft && (
                      <span
                        className="absolute inset-y-0 w-0.5 bg-secondary"
                        style={{ right: "-0.30rem" }}
                      />
                    )}
                    <div className="join">
                      <button
                        type="button"
                        className="btn rounded-l! join-item btn-primary cursor-grab"
                      >
                        {column.title}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteColumn(column.id);
                        }}
                        className="btn rounded-r! join-item btn-primary p-2 dark:btn-border-primary light:text-primary-content bg-primary/40 hover:bg-primary/80 dark:text-base-100 text-primary! hover:text-primary-content!"
                      >
                        <span className="iconify basil--cross-outline text-2xl font-bold">
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
              <fieldset className="fieldset">
                <input
                  className="input input-primary"
                  type="text"
                  value={defaultColumnInput}
                  onChange={(e) => setDefaultColumnInput(e.currentTarget.value)}
                  onKeyDown={handleDefaultColumnInputKeyDown}
                  placeholder="Add new column"
                />
                <p className="label">Hit enter to create</p>
              </fieldset>
            </div>
          </div>

          <div
            id="board-config-row-display-settings"
            className="mt-6 bg-base-200 p-5"
          >
            <div className="mb-4 items-baseline justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Row settings
                </h3>
                <p className="text-sm">
                  Use the arrow buttons to move rows up or down and pick a color
                  for each project row.
                </p>
              </div>
            </div>
            <ul className="list space-y-1 shadow-md">
              {rows.map((row, index) => (
                <li
                  key={row.id}
                  className="list-row grid grid-cols-3 items-center row-color-tint"
                  style={{ "--row-tint-color": row.color }}
                >
                  <div>
                    {editId === row.id
                      ? (
                        <input
                          className="input input-sm input-bordered w-full font-bold"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveRowEdit();
                            } else if (e.key === "Escape") {
                              cancelRowEdit();
                            }
                          }}
                          onBlur={saveRowEdit}
                          autoFocus
                        />
                      )
                      : (
                        <h4
                          className="font-bold cursor-text"
                          onDoubleClick={() => startRowEdit(row)}
                          title="Double-click to edit"
                        >
                          {row.title}
                        </h4>
                      )}
                  </div>
                  <div>
                    <select
                      className="select select-sm"
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
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className={`btn btn-sm btn-square btn-warning ${
                        index === 0 ? "invisible" : ""
                      }`}
                      onClick={() => moveRowUp(index)}
                      aria-label={`Move ${row.title} up`}
                    >
                      <span className="iconify hugeicons--arrow-up-big text-xl" />
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm btn-square btn-warning ${
                        index === rows.length - 1 ? "invisible" : ""
                      }`}
                      onClick={() => moveRowDown(index)}
                      aria-label={`Move ${row.title} down`}
                    >
                      <span className="iconify hugeicons--arrow-down-big text-xl" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div id="board-config-danger-zone" className="mt-6 bg-base-200 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">D-D-D-Danger Zone</h3>
              <p className="text-sm">
                These are changes you cannot undo! Be careful.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-error"
              onClick={confirmResetBoard}
            >
              Reset Board
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
