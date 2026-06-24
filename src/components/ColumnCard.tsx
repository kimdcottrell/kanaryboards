import TaskCard from "./TaskCard.tsx";
import {
  useColumnEditActions,
  useColumnEditState,
  useDragState,
  useTaskActions,
  useTasksByCell,
} from "./context/hooks.ts";
import { useRenderCount } from "@lib/use-render-count.ts";
import { beforeIdFromOrderedList, useDropTarget } from "@lib/drag.ts";

export default function ColumnCard({ column, row }) {
  const tasksByCell = useTasksByCell();
  const { draggedTask } = useDragState();
  const { editingColumnId, editingColumnRowId, editingColumnName } =
    useColumnEditState();
  const { setEditingColumnName, editColumnTitle, saveColumnTitle } =
    useColumnEditActions();
  const { openTaskForm, reorderTaskInCell, handleColumnDrop } =
    useTaskActions();
  const renderCount = useRenderCount();

  const { dropTarget, handleDragOver } = useDropTarget(!!draggedTask);

  const cellKey = `${row.id}|${column.id}`;
  const cellTasks = tasksByCell[cellKey] || [];

  const handleDrop = (e) => {
    e.preventDefault();
    const target = dropTarget;
    if (!draggedTask) return;

    if (draggedTask.rowId === row.id && draggedTask.colId === column.id) {
      reorderTaskInCell(
        draggedTask.id,
        beforeIdFromOrderedList(cellTasks, target),
      );
    } else {
      handleColumnDrop(
        row.id,
        column.id,
        beforeIdFromOrderedList(cellTasks, target),
      )(e);
    }
  };

  return (
    <div
      id={`column-card-${row.id}-${column.id}`}
      data-render-count={renderCount}
      className="flex w-xs shrink-0 flex-col rounded gap-3 p-3 shadow-sm shadow-base-300/10"
      style={{
        backgroundColor: `color-mix(in srgb, ${row.color} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${row.color} 13%, transparent)`,
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingColumnId === column.id && editingColumnRowId === row.id
            ? (
              <input
                className="w-full border border-base-300 px-2 py-1 text-xl font-semibold outline-none focus:border-base-content/40"
                type="text"
                value={editingColumnName}
                onChange={(e) => setEditingColumnName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveColumnTitle(column.id);
                  } else if (e.key === "Escape") {
                    setEditingColumnName(null);
                  }
                }}
                onBlur={() => saveColumnTitle(column.id)}
                autoFocus
              />
            )
            : (
              <h4
                className="text-xl font-semibold cursor-text font-roboto-slab"
                onDoubleClick={() => editColumnTitle(column, row)}
                title="Double-click to edit"
              >
                {column.title}
                <div className="ml-3 badge badge-sm badge-base-100 opacity-80">
                  {cellTasks.length}
                </div>
              </h4>
            )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-square btn-sm"
            type="button"
            style={{
              backgroundColor: `${row.color}`,
            }}
            onClick={() => openTaskForm(row.id, column.id)}
          >
            <span className="iconify hugeicons--add-01 text-xl text-base-100">
            </span>
          </button>
        </div>
      </div>
      <div className="space-y-3 rounded">
        {cellTasks.length === 0 && <p className="text-sm">No cards yet.</p>}
        {cellTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            row={row}
            onDragOver={(e) => {
              e.stopPropagation();
              handleDragOver(e, task.id);
            }}
            isDropBefore={dropTarget?.id === task.id &&
              dropTarget?.position === "before"}
            isDropAfter={dropTarget?.id === task.id &&
              dropTarget?.position === "after"}
            isDragging={draggedTask?.id === task.id}
          />
        ))}
      </div>
    </div>
  );
}
