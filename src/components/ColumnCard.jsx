import TaskCard from "./TaskCard.jsx";
import { useBoard } from "./context/useBoard.ts";

export default function ColumnCard({ column, row }) {
  const {
    tasksByCell,
    openTaskForm,
    handleColumnDrop,
  } = useBoard();

  const cellKey = `${row.id}|${column.id}`;
  const cellTasks = tasksByCell[cellKey] || [];

  return (
    <div
      className="flex w-sm shrink-0 flex-col rounded gap-4 p-4 shadow-lg shadow-base-300/10"
      style={{
        backgroundColor: `color-mix(in srgb, ${row.color} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${row.color} 13%, transparent)`,
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleColumnDrop(row.id, column.id)}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xl font-semibold">
            {column.name}
          </h4>
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
      <div className="space-y-4 rounded p-3">
        {cellTasks.length === 0 && <p className="text-sm">No cards yet.</p>}
        {cellTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            row={row}
            column={column}
          />
        ))}
      </div>
    </div>
  );
}
