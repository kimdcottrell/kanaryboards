import ColumnCard from "./ColumnCard.tsx";
import type { Column, Row } from "./context/types.ts";

// Shown when exactly one column is selected from the BoardMenu. Pivots the
// board: a single section titled with the column, where each project row
// becomes a horizontal column holding that project's tasks for this column.
export default function CondensedColumnBoard(
  { column, rows }: { column: Column; rows: Row[] },
) {
  return (
    <>
      <div className="absolute z-0 min-h-3/12 w-full bg-linear-to-br/oklch from-ctp-flamingo-100/50 dark:from-ctp-lavender-950 mask-b-from-base-100 to-base-100">
      </div>
      <section
        id="condensed-column-board"
        className="space-y-6 p-5 relative"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-row-grey) 10%, transparent)",
        }}
      >
        <h3 className="text-2xl font-roboto-slab font-semibold">
          {column.title}
        </h3>
        <div className="pb-4">
          <div className="flex gap-3">
            {rows.map((row) => (
              <ColumnCard
                key={row.id}
                column={column}
                row={row}
                headerLabel={row.title}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
