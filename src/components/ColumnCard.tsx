import { useEffect, useState } from "react";
import TaskCard from "./TaskCard.tsx";
import { useBoard } from "./context/useBoard.ts";

export default function ColumnCard({ column, row }) {
  const {
    tasksByCell,
    openTaskForm,
    handleColumnDrop,
    reorderTaskInCell,
    draggedTask,
    editingColumnId,
    editingColumnRowId,
    editingColumnName,
    setEditingColumnName,
    editColumnTitle,
    saveColumnTitle,
  } = useBoard();

  const [dropTarget, setDropTarget] = useState(null);

  const cellKey = `${row.id}|${column.id}`;
  const cellTasks = tasksByCell[cellKey] || [];

  useEffect(() => {
    if (!draggedTask) setDropTarget(null);
  }, [draggedTask]);

  const handleTaskDragOver = (e, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2
      ? "before"
      : "after";
    setDropTarget((prev) =>
      prev?.taskId === taskId && prev?.position === position
        ? prev
        : { taskId, position }
    );
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const target = dropTarget;
    setDropTarget(null);
    if (!draggedTask) return;

    if (draggedTask.rowId === row.id && draggedTask.colId === column.id) {
      let beforeTaskId;
      if (!target) {
        beforeTaskId = null;
      } else if (target.position === "before") {
        beforeTaskId = target.taskId;
      } else {
        const idx = cellTasks.findIndex((t) => t.id === target.taskId);
        beforeTaskId = idx !== -1 && idx < cellTasks.length - 1
          ? cellTasks[idx + 1].id
          : null;
      }
      reorderTaskInCell(draggedTask.id, beforeTaskId);
    } else {
      handleColumnDrop(row.id, column.id)(e);
    }
  };

  return (
    <div
      className="flex w-sm shrink-0 flex-col rounded gap-4 p-4 shadow-lg shadow-base-300/10"
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
                className="text-xl font-semibold cursor-text"
                onDoubleClick={() => editColumnTitle(column, row)}
                title="Double-click to edit"
              >
                {column.title}
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
            <span className="iconify hugeicons--credit-card-add text-xl text-base-100">
            </span>
          </button>
        </div>
      </div>
      <div className="space-y-4 rounded">
        {cellTasks.length === 0 && <p className="text-sm">No cards yet.</p>}
        {cellTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            row={row}
            column={column}
            onDragOver={(e) => handleTaskDragOver(e, task.id)}
            isDropBefore={dropTarget?.taskId === task.id &&
              dropTarget?.position === "before"}
            isDropAfter={dropTarget?.taskId === task.id &&
              dropTarget?.position === "after"}
            isDragging={draggedTask?.id === task.id}
          />
        ))}
      </div>
    </div>
  );
}
