import DynamicIcon from "./DynamicIcon.tsx";
import { useBoardConfigActions, useBoardDataState } from "./context/hooks.ts";

export default function BoardMenu(
  { isSticky, isPreview }: { isSticky?: boolean; isPreview?: boolean },
) {
  const { tasks, columns } = useBoardDataState();
  const { openBoardConfigModal } = useBoardConfigActions();

  const pinnedColumns = columns.filter((c) => c.pinned);

  return (
    <ul
      id="board-menu"
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
        w-fit
      `}
    >
      {pinnedColumns.map((column) => (
        <li key={column.id}>
          <a>
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
        <a
          id={isPreview ? undefined : "board-config-collapse-toggle"}
          onClick={openBoardConfigModal}
        >
          <span className="iconify hugeicons--settings-01"></span>
          Board Config
        </a>
      </li>
    </ul>
  );
}
