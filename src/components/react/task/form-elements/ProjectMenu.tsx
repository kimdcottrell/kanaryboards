import type { CSSProperties } from "react";
import type { Row } from "../../context/types.ts";

// `error` is the save's validation message for the project, if any.
export default function ProjectMenu({
  taskId,
  rows,
  selectedRowId,
  onSelect,
  error,
}: {
  taskId: string;
  rows: Row[];
  selectedRowId: string;
  onSelect?: (rowId: string) => void;
  error?: string;
}) {
  const name = `row-select-${taskId || "new"}`;
  return (
    <fieldset className="fieldset min-w-0">
      {
        /* The current project is tinted with its row color
          (.row-menu-item in global.css). */
      }
      <ul id={name} className="menu w-full p-0">
        <li>
          <legend
            className={`p-0 fieldset-legend menu-title text-[12px] uppercase font-bold ${
              error ? "text-error" : "text-base-content"
            }`}
          >
            Project
          </legend>
          {
            /* menu-title keeps the error from getting menu-item styling. */
          }
          {error && <span className="menu-title p-0 text-error">{error}</span>}
          <ul className="pt-2 mx-0">
            {rows.map((option) => (
              <li key={option.id}>
                <label
                  className={`font-roboto-slab font-semibold row-menu-item max-md:p-3 has-focus-visible:underline${
                    option.id === selectedRowId ? " menu-active" : ""
                  }`}
                  style={{
                    "--row-tint-color": option.color,
                  } as CSSProperties}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={name}
                    value={option.id}
                    checked={option.id === selectedRowId}
                    onChange={() => onSelect?.(option.id)}
                  />
                  {option.title}
                </label>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </fieldset>
  );
}
