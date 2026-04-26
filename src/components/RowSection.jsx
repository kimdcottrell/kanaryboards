import { useState } from "preact/hooks";
import ColumnCard from "./ColumnCard.jsx";
import CloseButton from "./buttons/CloseButton.tsx";
import { useBoard } from "./context/useBoard.ts";

export default function RowSection({ row }) {
  const [collapsed, setCollapsed] = useState(false);
  const {
    columns,
    editingRowId,
    editingRowName,
    setEditingRowName,
    editRowTitle,
    saveRowTitle,
    deleteRow,
  } = useBoard();

  return (
    <section
      class="space-y-4 p-5 shadow-lg shadow-base-300/10"
      style={{
        backgroundColor: `color-mix(in srgb, ${row.color} 10%, transparent)`,
      }}
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {editingRowId === row.id
            ? (
              <input
                class="w-full border border-base-300 px-4 py-2 text-2xl font-semibold outline-none focus:border-base-content/40"
                type="text"
                value={editingRowName}
                onInput={(e) => setEditingRowName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveRowTitle(row.id);
                  } else if (e.key === "Escape") {
                    setEditingRowName(null);
                  }
                }}
                onBlur={() => saveRowTitle(row.id)}
                autoFocus
              />
            )
            : (
              <h3
                class="text-2xl font-semibold"
                onDblClick={() => editRowTitle(row)}
              >
                {row.name}
                <span
                  data-tip="double click to edit"
                  class="tooltip text-xs align-super pl-2"
                  style={{
                    color: `${row.color}`,
                  }}
                >
                  <span class="iconify hugeicons--pencil-edit-02 text-xl">
                  </span>
                </span>
              </h3>
            )}
        </div>
        <div class="flex flex-col gap-3 sm:items-end">
          <div class="flex gap-2">
            <button
              type="button"
              class="btn btn-primary btn-sm btn-square opacity-80 hover:opacity-100"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand row" : "Collapse row"}
            >
              <span
                class={`iconify transition-transform duration-200 ${
                  collapsed
                    ? "hugeicons--arrow-up-01"
                    : "hugeicons--arrow-down-01"
                } text-xl`}
              />
            </button>
            <CloseButton
              onClick={() => {
                if (
                  confirm(
                    `Delete row "${row.name}"? \n\nThis will remove the "${row.name}" row. All columns and tasks will be removed.\n\nIt cannot be undone.`,
                  )
                ) deleteRow(row.id);
              }}
              class="opacity-80 hover:opacity-100"
              aria-label={`Delete project ${row.name}`}
            />
          </div>
        </div>
      </div>

      {!collapsed && (
        <div class="overflow-x-auto pb-4">
          <div class="flex gap-5">
            {columns.map((column) => (
              <ColumnCard
                key={column.id}
                column={column}
                row={row}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
