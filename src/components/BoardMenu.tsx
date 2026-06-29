import DynamicIcon from "./DynamicIcon.tsx";
import {
  useBoardConfigActions,
  useBoardDataState,
  useColumnFilterActions,
  useColumnFilterState,
  useRowFormActions,
  useTaskActions,
} from "./context/hooks.ts";

import { useEffect, useRef } from "react";

import type { MouseEvent } from "react";

export default function BoardMenu(
  { isSticky, isPreview }: { isSticky?: boolean; isPreview?: boolean },
) {
  const { tasks, columns } = useBoardDataState();
  const { openBoardConfigModal } = useBoardConfigActions();
  const { openCreateRowModal } = useRowFormActions();
  const { openTaskForm } = useTaskActions();
  const { selectedColumnIds } = useColumnFilterState();
  const { toggleColumnFilter } = useColumnFilterActions();

  const pinnedColumns = columns.filter((c) => c.pinned);

  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: globalThis.MouseEvent) => {
      const details = detailsRef.current;
      if (details?.open && !details.contains(e.target as Node)) {
        details.open = false;
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleClick = (action?: () => void) => (e: MouseEvent) => {
    if (isPreview) {
      e.preventDefault();
      return;
    }
    action?.();
  };

  return (
    <ul
      id={isPreview ? undefined : "board-menu"}
      className={`menu
        ${
        isPreview
          ? "relative"
          : `${
            isSticky ? "fixed top-0" : "absolute top-2"
          } left-1/2 -translate-x-1/2`
      }
        z-100 bg-base-100
        lg:menu-horizontal rounded-box
        justify-center
        flex
      `}
    >
      {pinnedColumns.map((column) => (
        <li key={column.id}>
          <a
            className={selectedColumnIds.includes(column.id)
              ? "bg-base-content/10"
              : undefined}
            onClick={handleClick(() => toggleColumnFilter(column.id))}
          >
            {column.iconInBoardMenu && column.icon && (
              <DynamicIcon name={column.icon} className="h-4 w-4" />
            )}
            {column.title}
            <span className="badge badge-sm font-roboto-slab font-semibold badge-info">
              {tasks.filter((t) => t.colId === column.id).length}
            </span>
          </a>
        </li>
      ))}
      <li>
        <details ref={detailsRef}>
          <summary onClick={handleClick()}>
            <span className="iconify hugeicons--dashboard-square-add text-xl">
            </span>
          </summary>
          <ul className="w-max">
            <li>
              <a onClick={handleClick(() => openTaskForm("", ""))}>
                <span className="iconify hugeicons--add-square"></span>Create
                new task
              </a>
            </li>
            <li>
              <a onClick={handleClick(openCreateRowModal)}>
                <span className="iconify hugeicons--row-insert"></span>Add new
                project row
              </a>
            </li>
            <li>
              <a
                onClick={handleClick(() =>
                  openBoardConfigModal("create-new-column")
                )}
              >
                <span className="iconify hugeicons--column-insert"></span>Add
                new column to all rows
              </a>
            </li>
          </ul>
        </details>
      </li>

      <li>
        <a
          id={isPreview ? undefined : "board-config-collapse-toggle"}
          onClick={handleClick(() => openBoardConfigModal())}
        >
          <span className="iconify hugeicons--settings-01 text-xl"></span>
        </a>
      </li>
    </ul>
  );
}
