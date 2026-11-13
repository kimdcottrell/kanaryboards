import { useState } from "react";
import {
  useBoardDataState,
  useRowActions,
} from "@components/react/context/hooks.ts";
import { rowColorOptions } from "@components/react/context/constants.ts";
import type { Row } from "@lib/types.ts";

export default function RowSettingsSection() {
  const { rows } = useBoardDataState();
  const { updateRowColor, moveRowUp, moveRowDown, renameRow } = useRowActions();

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string>();

  const startRowEdit = (row: Row) => {
    setEditId(row.id);
    setEditName(row.title);
  };

  // A validation error keeps the edit open and shows under the input.
  const saveRowEdit = async () => {
    if (!editId) return;
    const result = await renameRow(editId, editName);
    if (result) setEditError(result.error);
    else cancelRowEdit();
  };

  const cancelRowEdit = () => {
    setEditId(null);
    setEditName("");
    setEditError(undefined);
  };

  return (
    <div
      id="board-config-row-display-settings"
      className="mt-6 bg-base-200 p-2 md:p-3"
    >
      <div className="mb-4 items-baseline justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Row settings
          </h3>
          <p className="text-sm">
            Use the arrow buttons to move rows up or down and pick a color for
            each project row.
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
                  <>
                    <input
                      className={`input input-sm input-bordered w-full font-bold${
                        editError ? " input-error" : ""
                      }`}
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        setEditError(undefined);
                        setEditName(e.currentTarget.value);
                      }}
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
                    {editError && (
                      <p className="text-error text-sm mt-1">{editError}</p>
                    )}
                  </>
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
