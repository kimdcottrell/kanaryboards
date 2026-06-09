import { useState } from "react";
import ColumnCard from "./ColumnCard.tsx";
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
      id={`row-section-${row.id}`}
      className="space-y-4 p-5 shadow-lg shadow-base-300/10"
      style={{
        backgroundColor: `color-mix(in srgb, ${row.color} 10%, transparent)`,
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {editingRowId === row.id
            ? (
              <input
                className="w-full border border-base-300 px-4 py-2 text-2xl font-semibold outline-none focus:border-base-content/40"
                type="text"
                value={editingRowName}
                onChange={(e) => setEditingRowName(e.currentTarget.value)}
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
                className="text-2xl font-semibold"
                title="Double-click to edit"
                onDoubleClick={() => editRowTitle(row)}
              >
                {row.title}
              </h3>
            )}
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex gap-2">
            <button
              id={`row-collapse-btn-${row.id}`}
              type="button"
              className="btn btn-primary btn-sm btn-square opacity-80 hover:opacity-100"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand row" : "Collapse row"}
            >
              <span
                className={`iconify transition-transform duration-200 ${
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
                    `Delete row "${row.title}"? \n\nThis will remove the "${row.title}" row. All columns and tasks will be removed.\n\nIt cannot be undone.`,
                  )
                ) deleteRow(row.id);
              }}
              className="opacity-80 hover:opacity-100"
              aria-label={`Delete project ${row.title}`}
            />
          </div>
        </div>
      </div>

      {!collapsed && (
        <div id={`row-columns-${row.id}`} className="overflow-x-auto pb-4">
          <div className="flex gap-5">
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
