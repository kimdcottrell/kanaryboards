import { useEffect, useRef, useState } from "react";
import { animate, createScope, onScroll, splitText, stagger } from "animejs";
import ColumnSection from "./ColumnSection.tsx";
import CloseButton from "./shared/CloseButton.tsx";
import {
  useBoardDataState,
  useBoardMeta,
  useColumnFilterState,
  useRowActions,
  useRowEditActions,
  useRowEditState,
} from "./context/hooks.ts";
import { useRenderCount } from "@lib/dashboard/use-render-count.ts";
import type { Row } from "./context/types.ts";

export default function RowSection(
  { row, isNew = false }: { row: Row; isNew?: boolean },
) {
  const [collapsed, setCollapsed] = useState(false);
  // Captured on mount so later re-renders (isNew -> false) don't revert the
  // animation mid-play.
  const [animateTitle] = useState(isNew);
  const root = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!animateTitle || !titleRef.current) return;
    const title = titleRef.current;
    const scope = createScope({ root }).add(() => {
      const { chars } = splitText(title, { words: false, chars: true });
      animate(chars, {
        y: [
          { to: "-1rem", ease: "outExpo", duration: 600 },
          { to: 0, ease: "outBounce", duration: 800, delay: 100 },
        ],
        rotate: { from: "-1turn", delay: 0 },
        delay: stagger(50),
        ease: "inOutCirc",
        autoplay: onScroll({ target: title, repeat: false }),
      });
    });
    return () => scope.revert();
  }, [animateTitle]);
  const { columns } = useBoardDataState();
  const { selectedColumnIds } = useColumnFilterState();
  const visibleColumns = selectedColumnIds.length
    ? columns.filter((c) => selectedColumnIds.includes(c.id))
    : columns;
  const { boardId } = useBoardMeta();
  const { editingRowId, editingRowName } = useRowEditState();
  const { setEditingRowName, editRowTitle, saveRowTitle } = useRowEditActions();
  const { deleteRow } = useRowActions();
  const renderCount = useRenderCount();

  return (
    <div ref={root} className="relative w-full overflow-hidden">
      <div className="absolute z-0 min-h-[calc(100vh-50%)] w-full pink-purple-gradient">
      </div>
      <section
        id={`row-section-${row.id}`}
        data-render-count={renderCount}
        className="space-y-6 p-5 relative w-full"
        style={{
          backgroundColor: `color-mix(in srgb, ${row.color} 10%, transparent)`,
        }}
      >
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            {editingRowId === row.id
              ? (
                <input
                  className="w-full font-roboto-slab border border-base-300 px-4 py-2 text-2xl font-semibold outline-none focus:border-base-content/40"
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
                  ref={titleRef}
                  className="text-2xl font-roboto-slab font-semibold"
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
                  if (boardId === "demo") {
                    alert(
                      "Normally, this would allow you to delete a row and all the tasks inside it.\n\nBut this is a demo board, so... No.",
                    );
                    return;
                  }
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
          <div id={`row-columns-${row.id}`} className="pb-4 overflow-x-scroll">
            <div className="flex gap-3">
              {visibleColumns.map((column) => (
                <ColumnSection
                  key={column.id}
                  column={column}
                  row={row}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
