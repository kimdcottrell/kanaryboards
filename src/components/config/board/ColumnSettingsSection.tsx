import { useState } from "react";
import {
  useBoardDataState,
  useColumnConfigActions,
  useColumnConfigState,
} from "../../context/hooks.ts";

export default function ColumnSettingsSection() {
  const { columns } = useBoardDataState();
  const { defaultColumnInput, draggedDefaultIndex } = useColumnConfigState();
  const {
    setDefaultColumnInput,
    setDraggedDefaultIndex,
    handleDefaultColumnInputKeyDown,
    handleDefaultColumnDragStart,
    handleDefaultColumnDragOver,
    handleDefaultColumnDrop,
    deleteColumn,
  } = useColumnConfigActions();

  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);

  return (
    <div
      id="board-config-column-settings"
      className="mt-6 bg-base-200 p-5"
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Column settings
          </h3>
          <p className="text-sm">
            Manage the columns set used across projects. Drag badges to
            reorder, click x to remove, or add a new default column.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
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
              className="relative"
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
            >
              {isHovered && !dropFromLeft && (
                <span
                  className="absolute inset-y-0 w-0.5 bg-secondary"
                  style={{ left: "-0.30rem" }}
                />
              )}
              {isHovered && dropFromLeft && (
                <span
                  className="absolute inset-y-0 w-0.5 bg-secondary"
                  style={{ right: "-0.30rem" }}
                />
              )}
              <div className="join">
                <button
                  type="button"
                  className="btn rounded-l! join-item btn-primary cursor-grab"
                >
                  {column.title}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteColumn(column.id);
                  }}
                  className="btn rounded-r! join-item btn-primary p-2 dark:btn-border-primary light:text-primary-content bg-primary/40 hover:bg-primary/80 dark:text-base-100 text-primary! hover:text-primary-content!"
                >
                  <span className="iconify basil--cross-outline text-2xl font-bold">
                  </span>
                </button>
              </div>
            </div>
          );
        })}
        <fieldset className="fieldset">
          <input
            className="input input-primary"
            type="text"
            value={defaultColumnInput}
            onChange={(e) => setDefaultColumnInput(e.currentTarget.value)}
            onKeyDown={handleDefaultColumnInputKeyDown}
            placeholder="Add new column"
          />
          <p className="label">Hit enter to create</p>
        </fieldset>
      </div>
    </div>
  );
}
