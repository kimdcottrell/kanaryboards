import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";

export default function ColumnCard({ column, row, board }) {
  console.log("[DEBUG] ColumnCard rendered - column:", column.name, "row:", row.name);
  const {
    tasksByCell,
    taskFormCell,
    taskDraft,
    editingTaskId,
    openTaskForm,
    closeTaskForm,
    createTask,
    startEditTask,
    handleDragStart,
    handleDragEnd,
    handleColumnDrop,
    setTaskDraft,
    toggleTaskChecklist,
    addChecklistItem,
    updateChecklistItem,
    handleChecklistKeyDown,
    setChecklistInputRef,
  } = board;

  const cellKey = `${row.id}|${column.id}`;
  const cellTasks = tasksByCell[cellKey] || [];
  const isActiveForm = taskFormCell &&
    taskFormCell.rowId === row.id &&
    taskFormCell.colId === column.id;

  return (
    <div
      class="flex min-w-1/4 flex-col rounded gap-4 p-4 shadow-lg shadow-base-300/10"
      style={{
        backgroundColor: `${row.color}15`,
        border: `1px solid ${row.color}22`,
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleColumnDrop(row.id, column.id)}
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <h4 class="text-xl font-semibold">
            {column.name}
          </h4>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn btn-sm"
            type="button"
            style={{
              backgroundColor: `${row.color}`,
            }}
            onClick={() => openTaskForm(row.id, column.id)}
          >
            <span class="iconify hugeicons--credit-card-add text-xl text-base-100">
            </span>
          </button>
        </div>
      </div>
      <div class="space-y-4 rounded p-3">
        {!isActiveForm && cellTasks.length === 0 && (
          <p class="text-sm">No cards yet.</p>
        )}
        {isActiveForm && (
          <TaskForm
            taskDraft={taskDraft}
            setTaskDraft={setTaskDraft}
            createTask={createTask}
            closeTaskForm={closeTaskForm}
            addChecklistItem={addChecklistItem}
            updateChecklistItem={updateChecklistItem}
            handleChecklistKeyDown={handleChecklistKeyDown}
            setChecklistInputRef={setChecklistInputRef}
          />
        )}
        {cellTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            row={row}
            column={column}
            isEditing={task.id === editingTaskId}
            startEditTask={startEditTask}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            toggleTaskChecklist={toggleTaskChecklist}
          />
        ))}
      </div>
    </div>
  );
}
