import { useState } from "react";
import type { CSSProperties } from "react";
import type { Column } from "../../context/types.ts";

export default function StatusSteps({
  taskId,
  columns,
  selectedColId,
  onSelect,
}: {
  taskId: string;
  columns: Column[];
  selectedColId: string | null;
  onSelect?: (colId: string) => void;
}) {
  const name = `column-select-${taskId || "new"}`;
  // Trash is only reachable via the Trash button or drag-and-drop, so it is
  // shown only for a task that is already in it.
  const statusColumns = columns.filter((c) =>
    !c.isTrash || c.id === selectedColId
  );
  const selectedColIndex = statusColumns.findIndex((c) =>
    c.id === selectedColId
  );
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);

  return (
    <fieldset className="fieldset min-w-0">
      <legend className="fieldset-legend text-[12px] uppercase font-bold">
        Status
      </legend>
      <div className="overflow-x-auto">
        <div
          id={name}
          className="steps"
          onMouseLeave={() => setHoveredColIndex(null)}
        >
          {statusColumns.map((option, i) => {
            const stepClass = hoveredColIndex === null
              ? (i <= selectedColIndex ? " step-primary" : "")
              : (i <= hoveredColIndex ? " step-preview" : "");
            return (
              <label
                key={option.id}
                data-testid={`status-step-${option.id}`}
                className={`step relative cursor-pointer text-sm has-focus-visible:underline${stepClass}`}
                style={{ "--step-index": i } as CSSProperties}
                onMouseEnter={() => setHoveredColIndex(i)}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={name}
                  value={option.id}
                  checked={option.id === selectedColId}
                  onChange={() => {
                    setHoveredColIndex(null);
                    onSelect?.(option.id);
                  }}
                />
                {option.title}
              </label>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
