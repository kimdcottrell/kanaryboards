import ColumnCard from "./ColumnCard.jsx";
import { useBoard } from "./context/useBoard.ts";

export default function RowSection({ row }) {
  console.log("[DEBUG] RowSection rendered - row:", row.name);
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
      class="space-y-4 rounded p-5 shadow-lg shadow-base-300/10"
      style={{
        backgroundColor: `${row.color}1a`,
      }}
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {editingRowId === row.id
            ? (
              <input
                class="w-full rounded border border-base-300 px-4 py-2 text-2xl font-semibold outline-none focus:border-cyan-500"
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
          <button
            type="button"
            class="btn btn-error btn-square btn-sm opacity-80 hover:opacity-100 text-xl"
            onClick={() => deleteRow(row.id)}
            aria-label={`Delete project ${row.name}`}
          >
            <span class="iconify basil--cross-outline text-xl"></span>
          </button>
        </div>
      </div>

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
    </section>
  );
}
