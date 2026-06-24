import { useState } from "react";
import { useBoardDataState, useRowActions } from "../../context/hooks.ts";
import { rowColorOptions } from "../../context/constants.ts";

export default function RowSettingsSection() {
  const { rows } = useBoardDataState();
  const { updateRowColor, moveRowUp, moveRowDown, renameRow } =
    useRowActions();

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

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
                onChange={(e) => updateRowColor(row.id, e.currentTarget.value)}
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
  );
}
