import type { CSSProperties } from "react";
import type { Row } from "../../context/types.ts";

export default function ProjectMenu({
  taskId,
  rows,
  selectedRowId,
  onSelect,
  required = false,
}: {
  taskId: string;
  rows: Row[];
  selectedRowId: string;
  onSelect?: (rowId: string) => void;
  required?: boolean;
}) {
  const name = `row-select-${taskId || "new"}`;
  return (
    <fieldset className="fieldset min-w-0">
      {
        /* The current project is tinted with its row color
          (.row-menu-item in global.css). */
      }
      {
        /* After a failed submit (:user-invalid), the legend turns error-colored
          and shows the "Required" hint. */
      }
      <ul id={name} className="menu validator group/project w-full p-0">
        <li>
          <legend className="p-0 fieldset-legend menu-title text-base-content group-has-user-invalid/project:text-error text-[12px] uppercase font-bold">
            Project
          </legend>
          {
            /* menu-title keeps the hint from getting menu-item styling. */
          }
          {required && (
            <span className="validator-hint p-0 text-error hidden group-has-user-invalid/project:block group-has-user-invalid/project:visible">
              Required
            </span>
          )}
          <ul className="pt-2 mx-0">
            {rows.map((option) => (
              <li key={option.id}>
                <label
                  className={`font-roboto-slab font-semibold row-menu-item has-focus-visible:underline${
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
                    required={required}
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
