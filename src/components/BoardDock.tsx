import DynamicIcon from "./shared/DynamicIcon.tsx";
import { useSharedMenuActions } from "./context/hooks.ts";

export default function BoardDock({ isPreview }: { isPreview?: boolean }) {
  const {
    tasks,
    columns,
    selectedColumnIds,
    toggleColumnFilter,
    openSettings,
    detailsRef,
    handleClick,
    addActions,
  } = useSharedMenuActions(isPreview);

  const dockColumn = columns.find((c) => c.pinnedToDock);

  return (
    <div
      id={isPreview ? undefined : "board-dock"}
      className={`dock dock-md ${
        isPreview ? "relative" : "fixed bottom-0 left-0 lg:hidden"
      }`}
    >
      {dockColumn && (
        <button
          type="button"
          className={selectedColumnIds.includes(dockColumn.id)
            ? "dock-active"
            : undefined}
          onClick={handleClick(() => toggleColumnFilter(dockColumn.id))}
        >
          {dockColumn.iconInBoardMenu && dockColumn.icon
            ? <DynamicIcon name={dockColumn.icon} className="size-[1.2em]" />
            : <DynamicIcon name="chart" className="size-[1.2em]" />}
          <span className="dock-label flex items-center gap-1">
            {dockColumn.title}
            <span className="badge badge-xs font-roboto-slab font-semibold badge-info">
              {tasks.filter((t) => t.colId === dockColumn.id).length}
            </span>
          </span>
        </button>
      )}

      <details
        ref={detailsRef}
        className="dropdown dropdown-top flex flex-col items-center justify-center"
      >
        <summary
          className="flex flex-col items-center justify-center list-none [&::-webkit-details-marker]:hidden"
          onClick={handleClick()}
        >
          <span className="iconify hugeicons--dashboard-square-add text-xl">
          </span>
          <span className="dock-label">Add</span>
        </summary>
        <ul className="dropdown-content menu w-max bg-base-100 rounded-box shadow-sm mb-2">
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

      <button type="button" onClick={handleClick(openSettings)}>
        <span className="iconify hugeicons--settings-01 text-xl"></span>
        <span className="dock-label">Settings</span>
      </button>
    </div>
  );
}
