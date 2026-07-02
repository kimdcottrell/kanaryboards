import { useState } from "react";
import type { ReactNode } from "react";
import {
  useBoardDataState,
  useColumnConfigActions,
  useColumnConfigState,
} from "../context/hooks.ts";
import type { Column } from "../context/types.ts";

// Shared drag-to-reorder scaffolding for the board's columns: the flex track,
// leading/trailing drop zones, draggable wrappers, hover indicators, and the
// drag state/dispatch wiring. Each caller supplies its own card body via
// `renderCard`. Two consumers reuse this so the drag logic isn't duplicated:
//   - ColumnSettingsSection (Board Config modal) — full card: rename/pin/icon/delete
//   - DemoColumnSettings (homepage DemoExperience) — compact, title-only card
export default function ColumnReorderList(
  { renderCard }: { renderCard: (column: Column, index: number) => ReactNode },
) {
  const { columns } = useBoardDataState();
  const { draggedDefaultIndex } = useColumnConfigState();
  const {
    setDraggedDefaultIndex,
    handleDefaultColumnDragStart,
    handleDefaultColumnDragOver,
    handleDefaultColumnDrop,
    reorderColumn,
  } = useColumnConfigActions();

  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);

  return (
    <div className="flex gap-2 overflow-x-scroll scrollbar-auto scrollbar-thumb-accent scrollbar-track-accent/30 mt-4">
      {draggedDefaultIndex !== null && draggedDefaultIndex !== 0 && (
        <div
          onDragOver={(e) => {
            handleDefaultColumnDragOver(e);
            setDragHoverIndex(-1);
          }}
          onDrop={(e) => {
            handleDefaultColumnDrop(columns[0].id)(e);
            setDragHoverIndex(null);
          }}
          className="relative w-2 shrink-0"
        >
          {dragHoverIndex === -1 && (
            <span className="absolute inset-y-0 w-0.5 bg-accent left-0" />
          )}
        </div>
      )}
      {columns.map((column, index) => {
        const isDraggingThis = draggedDefaultIndex === index;
        const isHovered = dragHoverIndex === index &&
          draggedDefaultIndex !== null &&
          draggedDefaultIndex !== index;
        const dropFromLeft = draggedDefaultIndex !== null &&
          draggedDefaultIndex < index;
        return (
          <div
            key={column.id}
            draggable="true"
            onDragStart={handleDefaultColumnDragStart(index)}
            onDragOver={(e) => {
              handleDefaultColumnDragOver(e);
              setDragHoverIndex(index);
            }}
            onDrop={(e) => {
              handleDefaultColumnDrop(column.id)(e);
              setDragHoverIndex(null);
            }}
            onDragEnd={() => {
              setDraggedDefaultIndex(null);
              setDragHoverIndex(null);
            }}
            style={{ opacity: isDraggingThis ? 0.4 : 1 }}
            className="relative"
          >
            {isHovered && !dropFromLeft && (
              <span
                className="absolute inset-y-0 w-0.5 bg-accent"
                style={{ left: "-0.30rem" }}
              />
            )}
            {isHovered && dropFromLeft && (
              <span
                className="absolute inset-y-0 w-0.5 bg-accent"
                style={{ right: "-0.30rem" }}
              />
            )}
            {renderCard(column, index)}
          </div>
        );
      })}
      {draggedDefaultIndex !== null &&
        draggedDefaultIndex !== columns.length - 1 && (
        <div
          onDragOver={(e) => {
            handleDefaultColumnDragOver(e);
            setDragHoverIndex(columns.length);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const draggedId = columns[draggedDefaultIndex]?.id;
            if (draggedId) reorderColumn(draggedId, null);
            setDraggedDefaultIndex(null);
            setDragHoverIndex(null);
          }}
          className="relative w-2 shrink-0"
        >
          {dragHoverIndex === columns.length && (
            <span className="absolute inset-y-0 w-0.5 bg-accent right-0" />
          )}
        </div>
      )}
    </div>
  );
}
