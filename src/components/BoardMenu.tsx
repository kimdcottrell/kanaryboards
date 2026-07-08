import DynamicIcon from "./shared/DynamicIcon.tsx";
import { useSharedMenuActions } from "./context/hooks.ts";
import { byOrder } from "./context/ordering.ts";

export default function BoardMenu(
  { isSticky, isPreview }: { isSticky?: boolean; isPreview?: boolean },
) {
  const {
    rows,
    tasks,
    columns,
    selectedColumnIds,
    toggleColumnFilter,
    openSettings,
    detailsRef,
    rowsDetailsRef,
    handleClick,
    addActions,
  } = useSharedMenuActions(isPreview);

  const pinnedColumns = columns.filter((c) => c.pinnedToShortcut);
  const sortedRows = [...rows].sort(byOrder);

  return (
    <ul
      id={isPreview ? undefined : "board-menu"}
      className={`menu
        ${
        isPreview
          ? "relative w-max flex-nowrap"
          : `max-lg:hidden ${
            isSticky ? "fixed top-0" : "absolute top-2"
          } left-1/2 -translate-x-1/2`
      }
        z-100 bg-base-100
        menu-horizontal rounded-box
        justify-center
        flex
      `}
    >
      <li>
        <details ref={rowsDetailsRef}>
          <summary onClick={handleClick()}>
            <span className="iconify hugeicons--left-to-right-list-dash text-xl">
            </span>
          </summary>
          <ul className="w-max" data-drawer-row-list-mirror>
            {sortedRows.map((row) => (
              <li key={row.id}>
                <a href={`/dashboard/row/${row.id}`} data-board-link>
                  {row.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </li>
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
            {addActions.map((action) => (
              <li key={action.label}>
                <a onClick={handleClick(action.run)}>
                  <span className={`iconify ${action.icon}`}></span>
                  {action.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </li>

      <li>
        <a
          id={isPreview ? undefined : "board-config-collapse-toggle"}
          onClick={handleClick(openSettings)}
        >
          <span className="iconify hugeicons--settings-01 text-xl"></span>
        </a>
      </li>
    </ul>
  );
}
