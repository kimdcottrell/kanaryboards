import { useEffect, useMemo, useRef, useState } from "preact/hooks";

const STORAGE_KEY = "claudekan-board-state";
const createId = () =>
  `${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;

const initialDefaultColumnNames = ["todo", "working on it", "done"];

const rowColorOptions = [
  { label: "Blue", value: "#38bdf8" },
  { label: "Green", value: "#34d399" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#fb7185" },
  { label: "Violet", value: "#a855f7" },
  { label: "Slate", value: "#64748b" },
];

const defaultRows = [];

const defaultTasks = [];

const loadPersistedState = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const emptyTaskDraft = (rowId, colId) => ({
  title: "",
  description: "",
  checklist: [{ id: createId(), text: "", checked: false }],
  rowId,
  colId,
});

export default function KanbanBoard() {
  const persistedState = loadPersistedState();
  const initialDefaultColumns = persistedState?.defaultColumnNames ||
    initialDefaultColumnNames;

  const [rows, setRows] = useState(() => persistedState?.rows || defaultRows);
  const [defaultColumnNames, setDefaultColumnNames] = useState(
    initialDefaultColumns,
  );
  const [columns, setColumns] = useState(() => {
    if (persistedState?.columns) return persistedState.columns;
    return initialDefaultColumns.map((name) => ({ id: createId(), name }));
  });
  const [tasks, setTasks] = useState(() =>
    persistedState?.tasks || defaultTasks
  );
  const [newRowName, setNewRowName] = useState("");
  const [newRowPrompt, setNewRowPrompt] = useState("");
  const [taskGenerationStatus, setTaskGenerationStatus] = useState("");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [defaultColumnInput, setDefaultColumnInput] = useState("");
  const [taskFormCell, setTaskFormCell] = useState(null);
  const [taskDraft, setTaskDraft] = useState(emptyTaskDraft("row-1", "col-1"));
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskDraft, setEditTaskDraft] = useState(null);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingRowName, setEditingRowName] = useState("");
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedDefaultIndex, setDraggedDefaultIndex] = useState(null);
  const checklistInputRefs = useRef({});

  const tasksByCell = useMemo(() => {
    const grouped = {};
    tasks.forEach((task) => {
      const key = `${task.rowId}|${task.colId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });
    return grouped;
  }, [tasks]);

  const findTodoColumnId = () => {
    const todoColumn = columns.find((column) =>
      column.name.toLowerCase().trim() === "todo",
    );
    return todoColumn?.id || columns[0]?.id;
  };

  const parseGeneratedTasks = (content) =>
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        line
          .replace(/^\s*[-*+\d\.\)]+\s*/, "")
          .trim()
          .replace(/,$/, "")
          .trim(),
      )
      .filter(Boolean)
      .slice(0, 10);

  const generateTasksForRow = async (rowId) => {
    const prompt = newRowPrompt.trim();
    if (!prompt) return;

    setIsGeneratingTasks(true);
    setTaskGenerationStatus("Generating tasks...");

    try {
      const response = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, maxTasks: 10 }),
      });

      if (!response.ok) {
        throw new Error("Task generation failed");
      }

      const data = await response.json();
      const titles = Array.isArray(data.tasks)
        ? data.tasks.map((task) => String(task).trim())
        : [];
      const parsedTasks = parseGeneratedTasks(titles.join("\n"));
      const todoColId = findTodoColumnId();
      const generatedTasks = parsedTasks.map((title) => ({
        id: createId(),
        rowId,
        colId: todoColId,
        title,
        description: "",
        checklist: [],
      }));

      if (generatedTasks.length > 0) {
        setTasks((prev) => [...generatedTasks, ...prev]);
        setTaskGenerationStatus(
          `Added ${generatedTasks.length} task${generatedTasks.length > 1 ? "s" : ""} to Todo`,
        );
        setNewRowPrompt("");
      } else {
        setTaskGenerationStatus("No tasks were generated.");
      }
    } catch (error) {
      console.error(error);
      setTaskGenerationStatus(
        "Unable to generate tasks. Please check your Deepseek configuration.",
      );
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const addRow = async (event) => {
    event.preventDefault();
    if (!newRowName.trim()) return;
    const row = {
      id: createId(),
      name: newRowName.trim(),
      color: rowColorOptions[0].value,
    };
    setRows([...rows, row]);
    setNewRowName("");

    if (newRowPrompt.trim()) {
      await generateTasksForRow(row.id);
    }
  };

  const updateColumnsFromDefaultNames = (nextNames) => {
    setDefaultColumnNames(nextNames);
    setColumns((prevColumns) => {
      const nextColumns = nextNames.map((name) => {
        const existing = prevColumns.find((column) => column.name === name);
        return existing || { id: createId(), name };
      });
      const nextColumnIds = nextColumns.map((column) => column.id);
      setTasks((prevTasks) =>
        prevTasks.filter((task) => nextColumnIds.includes(task.colId))
      );
      return nextColumns;
    });
  };

  const addDefaultColumn = (name) => {
    const trimmed = name.trim();
    if (!trimmed || defaultColumnNames.includes(trimmed)) return;
    updateColumnsFromDefaultNames([...defaultColumnNames, trimmed]);
    setDefaultColumnInput("");
  };

  const removeDefaultColumn = (name) => {
    updateColumnsFromDefaultNames(
      defaultColumnNames.filter((columnName) => columnName !== name),
    );
  };

  const moveDefaultColumn = (fromIndex, toIndex) => {
    const nextNames = [...defaultColumnNames];
    const [moved] = nextNames.splice(fromIndex, 1);
    nextNames.splice(toIndex, 0, moved);
    updateColumnsFromDefaultNames(nextNames);
  };

  const handleDefaultColumnInputKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDefaultColumn(defaultColumnInput);
    }
  };

  const handleDefaultColumnDragStart = (index) => (event) => {
    setDraggedDefaultIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDefaultColumnDragOver = (event) => {
    event.preventDefault();
  };

  const handleDefaultColumnDrop = (index) => (event) => {
    event.preventDefault();
    const fromIndex = draggedDefaultIndex !== null
      ? draggedDefaultIndex
      : Number(event.dataTransfer.getData("text/plain"));
    if (fromIndex === index || Number.isNaN(fromIndex)) return;
    moveDefaultColumn(fromIndex, index);
    setDraggedDefaultIndex(null);
  };

  const moveRow = (fromIndex, toIndex) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      toIndex >= rows.length
    ) return;
    const nextRows = [...rows];
    const [moved] = nextRows.splice(fromIndex, 1);
    nextRows.splice(toIndex, 0, moved);
    setRows(nextRows);
  };

  const moveRowUp = (index) => moveRow(index, index - 1);
  const moveRowDown = (index) => moveRow(index, index + 1);

  const deleteColumn = (columnId) => {
    setColumns(columns.filter((column) => column.id !== columnId));
    setTasks(tasks.filter((task) => task.colId !== columnId));
    if (taskFormCell?.colId === columnId) {
      setTaskFormCell(null);
    }
    if (editingTaskId) {
      const editingTask = tasks.find((task) => task.id === editingTaskId);
      if (editingTask?.colId === columnId) {
        setEditingTaskId(null);
        setEditTaskDraft(null);
      }
    }
  };

  const deleteRow = (rowId) => {
    setRows(rows.filter((row) => row.id !== rowId));
    setTasks(tasks.filter((task) => task.rowId !== rowId));
    if (taskFormCell?.rowId === rowId) {
      setTaskFormCell(null);
    }
    if (editingTaskId) {
      const editingTask = tasks.find((task) => task.id === editingTaskId);
      if (editingTask?.rowId === rowId) {
        setEditingTaskId(null);
        setEditTaskDraft(null);
      }
    }
    if (editingRowId === rowId) {
      setEditingRowId(null);
      setEditingRowName("");
    }
  };

  const updateRowColor = (rowId, color) => {
    setRows(rows.map((row) => (row.id === rowId ? { ...row, color } : row)));
  };

  const editRowTitle = (row) => {
    setEditingRowId(row.id);
    setEditingRowName(row.name);
  };

  const saveRowTitle = (rowId) => {
    const trimmed = editingRowName.trim();
    if (!trimmed) {
      setEditingRowId(null);
      return;
    }
    setRows(
      rows.map((row) => (row.id === rowId ? { ...row, name: trimmed } : row)),
    );
    setEditingRowId(null);
  };

  const openTaskForm = (rowId, colId) => {
    setTaskFormCell({ rowId, colId });
    setTaskDraft(emptyTaskDraft(rowId, colId));
  };

  const closeTaskForm = () => {
    setTaskFormCell(null);
  };

  const resetBoard = () => {
    setRows(defaultRows);
    setColumns(defaultColumnNames.map((name) => ({ id: createId(), name })));
    setTasks(defaultTasks);
    setTaskFormCell(null);
    setEditingTaskId(null);
    setEditTaskDraft(null);
    setNewRowName("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const confirmResetBoard = () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm(
      "Reset the board? This will clear all projects and cards.",
    );
    if (confirmed) {
      resetBoard();
    }
  };

  const setChecklistInputRef = (id, element) => {
    if (element) {
      checklistInputRefs.current[id] = element;
    } else {
      delete checklistInputRefs.current[id];
    }
  };

  const addChecklistItem = (focusNew = false) => {
    const newItem = { id: createId(), text: "", checked: false };
    setTaskDraft((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newItem],
    }));
    if (focusNew) {
      setTimeout(() => {
        checklistInputRefs.current[newItem.id]?.focus();
      }, 0);
    }
  };

  const addEditChecklistItem = (focusNew = false) => {
    const newItem = { id: createId(), text: "", checked: false };
    setEditTaskDraft((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newItem],
    }));
    if (focusNew) {
      setTimeout(() => {
        checklistInputRefs.current[newItem.id]?.focus();
      }, 0);
    }
  };

  const updateChecklistItem = (id, field, value) => {
    setTaskDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const updateEditChecklistItem = (id, field, value) => {
    setEditTaskDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleChecklistKeyDown = (event, index, checklist, addItemFn) => {
    if (
      event.key === "Enter" && event.shiftKey && index === checklist.length - 1
    ) {
      event.preventDefault();
      addItemFn(true);
    }
  };

  const createTask = (event) => {
    event.preventDefault();
    if (!taskDraft.title.trim()) return;
    setTasks([
      {
        id: createId(),
        rowId: taskDraft.rowId,
        colId: taskDraft.colId,
        title: taskDraft.title.trim(),
        description: taskDraft.description.trim(),
        checklist: taskDraft.checklist.filter((item) => item.text.trim()),
      },
      ...tasks,
    ]);
    closeTaskForm();
  };

  const toggleTaskChecklist = (taskId, itemId) => {
    setTasks(
      tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          checklist: task.checklist.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        };
      }),
    );
  };

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditTaskDraft({
      ...task,
      checklist: task.checklist.length
        ? task.checklist
        : [{ id: createId(), text: "", checked: false }],
    });
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditTaskDraft(null);
  };

  const saveTaskEdit = (event) => {
    event.preventDefault();
    if (!editTaskDraft.title.trim()) return;
    setTasks(
      tasks.map((task) =>
        task.id === editingTaskId
          ? {
            ...task,
            title: editTaskDraft.title.trim(),
            description: editTaskDraft.description.trim(),
            rowId: editTaskDraft.rowId,
            colId: editTaskDraft.colId,
            checklist: editTaskDraft.checklist.filter((item) =>
              item.text.trim()
            ),
          }
          : task
      ),
    );
    cancelEditTask();
  };

  const handleDragStart = (task, rowId, colId, event) => {
    setDraggedTask({ taskId: task.id, rowId, colId });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const moveTaskToColumn = (taskId, rowId, colId) => {
    setTasks(
      tasks.map((task) => task.id === taskId ? { ...task, colId } : task),
    );
  };

  const handleColumnDrop = (rowId, colId) => (event) => {
    event.preventDefault();
    if (!draggedTask) return;
    if (draggedTask.rowId !== rowId) return;
    if (draggedTask.colId === colId) return;
    moveTaskToColumn(draggedTask.taskId, rowId, colId);
    setDraggedTask(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rows, columns, tasks, defaultColumnNames }),
    );
  }, [rows, columns, tasks, defaultColumnNames]);

  return (
    <div class="space-y-8 w-full">
      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-300/20">
        <div class="navbar p-0">
          <div class="flex-1">
            <h2 class="text-3xl font-semibold text-slate-900">Board Configuration</h2>
            <p class="mt-3 max-w-2xl text-slate-600">
              Add rows and columns, then place tasks into each column. Each task
              can include a title, description, and optional checklist.
            </p>
          </div>
          <div class="flex-none">
            <button
              type="button"
              class="btn btn-error btn text-white"
              onClick={confirmResetBoard}
            >
              Reset Board
            </button>
          </div>
        </div>
        <div class="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">
                Default column settings
              </h3>
              <p class="text-sm text-slate-600">
                Manage the default column set used across projects. Drag badges
                to reorder, click x to remove, or add a new default column.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            {defaultColumnNames.map((name, index) => (
              <div
                key={name}
                draggable="true"
                onDragStart={handleDefaultColumnDragStart(index)}
                onDragOver={handleDefaultColumnDragOver}
                onDrop={handleDefaultColumnDrop(index)}
                onDragEnd={() => setDraggedDefaultIndex(null)}
                class="badge badge-outline badge-primary flex items-center gap-2 cursor-grab"
              >
                <span>{name}</span>
                <button
                  type="button"
                  class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeDefaultColumn(name);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <input
              class="min-w-[14rem] rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-cyan-500"
              type="text"
              value={defaultColumnInput}
              onInput={(e) => setDefaultColumnInput(e.currentTarget.value)}
              onKeyDown={handleDefaultColumnInputKeyDown}
              placeholder="Add default column"
            />
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-1">
          <form
            class="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5"
            onSubmit={addRow}
          >
            <h3 class="text-lg font-semibold text-slate-900">Create a new row</h3>
            <div class="flex gap-2">
              <input
                class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-cyan-500"
                type="text"
                value={newRowName}
                onInput={(e) => setNewRowName(e.currentTarget.value)}
                placeholder="A project name, a category for large project tasks, etc."
              />
              
            </div>
            <div class="grid gap-2">
              <label class="text-sm font-medium text-slate-700" htmlFor="newRowPrompt">
                Generate up to 10 tasks using AI
              </label>
              <input
                id="newRowPrompt"
                class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-cyan-500"
                type="text"
                value={newRowPrompt}
                onInput={(e) => setNewRowPrompt(e.currentTarget.value)}
                placeholder="Enter a brief description of tasks to generate"
              />
              {taskGenerationStatus && (
                <p class="text-sm text-slate-500">{taskGenerationStatus}</p>
              )}
            </div>
            <button
            class="rounded-2xl bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-500 disabled:bg-slate-300"
            type="submit"
            disabled={isGeneratingTasks}
            >
            {isGeneratingTasks ? "Generating…" : "Add Row"}
            </button>
          </form>
        </div>
        <div class="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">
                Row settings
              </h3>
              <p class="text-sm text-slate-600">
                Use the arrow buttons to move rows up or down and pick a color
                for each project row.
              </p>
            </div>
          </div>
          <div class="overflow-x-auto">
            <ul class="list bg-base-100 rounded-box shadow-md">
              {rows.map((row, index) => (
                <li
                  key={row.id}
                  class="grid grid-cols-3 list-row gap-3 mb-2 border"
                  style={{
                    backgroundColor: `${row.color}22`,
                    borderColor: row.color,
                  }}
                >
                  <div>
                    <h4 class="font-bold text-md">{row.name}</h4>
                  </div>
                  <div>
                    <select
                        class="max-w-xs rounded-full border bg-white px-3 py-1 text-sm text-slate-900 outline-none"
                        style={{ borderColor: row.color }}
                        value={row.color}
                        onChange={(e) =>
                        updateRowColor(row.id, e.currentTarget.value)}
                    >
                        {rowColorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                        ))}
                    </select>
                  </div>
                  <div class="flex items-end gap-2">
                    <button
                      type="button"
                      class={`btn btn-square btn-ghost ${index === 0 ? "hidden" : ""}`}
                      style={{ color: row.color, borderColor: row.color }}
                      disabled={index === 0}
                      onClick={() => moveRowUp(index)}
                      aria-label={`Move ${row.name} up`}
                    >
                      ⌃
                    </button>
                    <button
                      type="button"
                      class={`btn btn-square btn-ghost ${index === rows.length - 1 ? "hidden" : ""}`}
                      style={{ color: row.color, borderColor: row.color }}
                      disabled={index === rows.length - 1}
                      onClick={() => moveRowDown(index)}
                      aria-label={`Move ${row.name} down`}
                    >
                      ⌄
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
      </section>

      <div class="space-y-10">
        {rows.map((row) => (
          <section
            key={row.id}
            class="space-y-4 rounded-[2rem] border p-5 shadow-lg shadow-slate-300/10"
            style={{
              backgroundColor: `${row.color}1a`,
              borderColor: row.color,
            }}
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {editingRowId === row.id
                  ? (
                    <input
                      class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-2xl font-semibold text-slate-900 outline-none focus:border-cyan-500"
                      type="text"
                      value={editingRowName}
                      onInput={(e) => setEditingRowName(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveRowTitle(row.id);
                        } else if (e.key === "Escape") {
                          setEditingRowId(null);
                        }
                      }}
                      onBlur={() => setEditingRowId(null)}
                      autoFocus
                    />
                  )
                  : (
                    <h3
                      class="text-2xl font-semibold text-slate-900"
                      onDblClick={() => editRowTitle(row)}
                    >
                      {row.name}
                    <span class="text-xs align-super pl-2" style={{
                        color: `${row.color}`,
                    }}> 🖉</span> </h3>
                  )}
              </div>
              <div class="flex flex-col gap-3 sm:items-end">
                <button
                  type="button"
                  class="btn btn-square btn-ghost btn-sm text-xl"
                  style={{ color: row.color, borderColor: row.color }}
                  onClick={() => deleteRow(row.id)}
                  aria-label={`Delete project ${row.name}`}
                >
                  ×
                </button>
              </div>
            </div>

            <div class="overflow-x-auto pb-4">
              <div class="flex gap-5 min-w-[90rem]">
                {columns.map((column) => {
                  const cellKey = `${row.id}|${column.id}`;
                  const cellTasks = tasksByCell[cellKey] || [];
                  const isActiveForm = taskFormCell &&
                    taskFormCell.rowId === row.id &&
                    taskFormCell.colId === column.id;

                  return (
                    <div
                      key={column.id}
                      class="flex min-w-[22rem] flex-col gap-4 rounded-[1.75rem] p-4 shadow-lg shadow-slate-300/10"
                      style={{
                        backgroundColor: `${row.color}15`,
                        border: `1px solid ${row.color}22`,
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleColumnDrop(row.id, column.id)}
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <h4 class="text-xl font-semibold text-slate-900">
                            {column.name}
                          </h4>
                        </div>
                        <div class="flex items-center gap-2">
                          <button
                            class="rounded-full px-4 py-2 text-sm font-semibold transition"
                            type="button"
                            style={{
                              color: row.color,
                              border: `1px solid ${row.color}`,
                              backgroundColor: `${row.color}1a`,
                            }}
                            onClick={() => openTaskForm(row.id, column.id)}
                          >
                            + Add card
                          </button>
                        </div>
                      </div>
                      <div class="space-y-4 rounded-[1.5rem] bg-white p-3">
                        {!isActiveForm && cellTasks.length === 0 && (
                          <p class="text-sm text-slate-500">No cards yet.</p>
                        )}
                        {isActiveForm && (
                          <article class="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm shadow-slate-900/5">
                            <form class="space-y-4" onSubmit={createTask}>
                              <div>
                                <label class="block text-sm font-medium text-slate-700">
                                  Title
                                </label>
                                <input
                                  class="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-cyan-500"
                                  type="text"
                                  value={taskDraft.title}
                                  onInput={(e) =>
                                    setTaskDraft({
                                      ...taskDraft,
                                      title: e.currentTarget.value,
                                    })}
                                  required
                                />
                              </div>
                              <div>
                                <label class="block text-sm font-medium text-slate-700">
                                  Description
                                </label>
                                <textarea
                                  class="mt-2 h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-cyan-500"
                                  value={taskDraft.description}
                                  onInput={(e) =>
                                    setTaskDraft({
                                      ...taskDraft,
                                      description: e.currentTarget.value,
                                    })}
                                />
                              </div>
                              <div class="space-y-3 rounded-2xl border border-slate-300 bg-white p-4">
                                <div class="flex items-center justify-between gap-3">
                                  <p class="text-sm font-semibold text-slate-900">
                                    Checklist items
                                  </p>
                                  <button
                                    type="button"
                                    class="rounded-2xl bg-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-300"
                                    onClick={() => addChecklistItem(true)}
                                  >
                                    Add item
                                  </button>
                                </div>
                                <div class="space-y-3">
                                  {taskDraft.checklist.map((item, index) => (
                                    <div
                                      key={item.id}
                                      class="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={item.checked}
                                        onInput={() =>
                                          updateChecklistItem(
                                            item.id,
                                            "checked",
                                            !item.checked,
                                          )}
                                        class="h-4 w-4 rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-400"
                                      />
                                      <input
                                        class="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
                                        type="text"
                                        value={item.text}
                                        onInput={(e) =>
                                          updateChecklistItem(
                                            item.id,
                                            "text",
                                            e.currentTarget.value,
                                          )}
                                        onKeyDown={(e) =>
                                          handleChecklistKeyDown(
                                            e,
                                            index,
                                            taskDraft.checklist,
                                            addChecklistItem,
                                          )}
                                        ref={(el) =>
                                          setChecklistInputRef(item.id, el)}
                                        placeholder="Checklist item"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div class="flex justify-end gap-2">
                                <button
                                  type="button"
                                  class="rounded-2xl bg-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-300"
                                  onClick={closeTaskForm}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  class="rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                                >
                                  Create card
                                </button>
                              </div>
                            </form>
                          </article>
                        )}
                        {cellTasks.map((task) => {
                          const isEditing = editingTaskId === task.id;

                          return (
                            <article
                              key={task.id}
                              draggable={isEditing ? "false" : "true"}
                              onDragStart={isEditing
                                ? undefined
                                : (event) =>
                                  handleDragStart(
                                    task,
                                    row.id,
                                    column.id,
                                    event,
                                  )}
                              onDragEnd={handleDragEnd}
                              class="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm shadow-slate-900/5"
                            >
                              {isEditing && editTaskDraft
                                ? (
                                  <form
                                    class="space-y-4"
                                    onSubmit={saveTaskEdit}
                                  >
                                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div class="w-full">
                                        <label class="block text-sm font-medium text-slate-700">
                                          Title
                                        </label>
                                        <input
                                          class="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-cyan-500"
                                          type="text"
                                          value={editTaskDraft.title}
                                          onInput={(e) =>
                                            setEditTaskDraft({
                                              ...editTaskDraft,
                                              title: e.currentTarget.value,
                                            })}
                                          required
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        class="h-fit rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
                                        onClick={cancelEditTask}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    <div>
                                      <label class="block text-sm font-medium text-slate-700">
                                        Description
                                      </label>
                                      <textarea
                                        class="mt-2 h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 outline-none focus:border-cyan-500"
                                        value={editTaskDraft.description}
                                        onInput={(e) =>
                                          setEditTaskDraft({
                                            ...editTaskDraft,
                                            description: e.currentTarget.value,
                                          })}
                                      />
                                    </div>
                                    <div>
                                      <p class="text-xs uppercase tracking-[0.18em] text-slate-500">
                                        Status
                                      </p>
                                      <select
                                        id={`column-select-${task.id}`}
                                        class="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                                        value={editTaskDraft.colId}
                                        onChange={(e) =>
                                          setEditTaskDraft({
                                            ...editTaskDraft,
                                            colId: e.currentTarget.value,
                                          })}
                                      >
                                        {columns.map((option) => (
                                          <option
                                            key={option.id}
                                            value={option.id}
                                          >
                                            {option.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <p class="text-xs uppercase tracking-[0.18em] text-slate-500">
                                        Row
                                      </p>
                                      <select
                                        id={`row-select-${task.id}`}
                                        class="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                                        value={editTaskDraft.rowId}
                                        onChange={(e) =>
                                          setEditTaskDraft({
                                            ...editTaskDraft,
                                            rowId: e.currentTarget.value,
                                          })}
                                      >
                                        {rows.map((option) => (
                                          <option
                                            key={option.id}
                                            value={option.id}
                                          >
                                            {option.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div class="space-y-3 rounded-2xl border border-slate-300 bg-white p-4">
                                      <div class="flex items-center justify-between gap-3">
                                        <p class="text-sm font-semibold text-slate-900">
                                          Checklist items
                                        </p>
                                        <button
                                          type="button"
                                          class="rounded-2xl bg-slate-200 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-300"
                                          onClick={() =>
                                            addEditChecklistItem(true)}
                                        >
                                          Add item
                                        </button>
                                      </div>
                                      <div class="space-y-3">
                                        {editTaskDraft.checklist.map((
                                          item,
                                          index,
                                        ) => (
                                          <div
                                            key={item.id}
                                            class="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={item.checked}
                                              onInput={() =>
                                                updateEditChecklistItem(
                                                  item.id,
                                                  "checked",
                                                  !item.checked,
                                                )}
                                              class="h-4 w-4 rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-400"
                                            />
                                            <input
                                              class="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
                                              type="text"
                                              value={item.text}
                                              onInput={(e) =>
                                                updateEditChecklistItem(
                                                  item.id,
                                                  "text",
                                                  e.currentTarget.value,
                                                )}
                                              onKeyDown={(e) =>
                                                handleChecklistKeyDown(
                                                  e,
                                                  index,
                                                  editTaskDraft.checklist,
                                                  addEditChecklistItem,
                                                )}
                                              ref={(el) =>
                                                setChecklistInputRef(
                                                  item.id,
                                                  el,
                                                )}
                                              placeholder="Checklist item"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div class="flex justify-end">
                                      <button
                                        type="submit"
                                        class="rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </form>
                                )
                                : (
                                  <div class="space-y-3">
                                    <div class="flex items-start justify-between gap-3">
                                      <div>
                                        <h5 class="text-base font-semibold text-slate-900">
                                          {task.title}
                                        </h5>
                                        <p class="mt-1 text-sm text-slate-600">
                                          {task.description}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        class="rounded-full bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
                                        onClick={() => startEditTask(task)}
                                      >
                                        Edit
                                      </button>
                                    </div>
                                    {task.checklist &&
                                      task.checklist.length > 0 && (
                                      <div class="space-y-2 rounded-3xl bg-slate-100 p-3">
                                        <p class="text-xs uppercase tracking-[0.18em] text-cyan-600">
                                          Checklist
                                        </p>
                                        <div class="space-y-2">
                                          {task.checklist.map((item) => (
                                            <label
                                              key={item.id}
                                              class="flex items-center gap-2 text-sm text-slate-700"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onInput={() =>
                                                  toggleTaskChecklist(
                                                    task.id,
                                                    item.id,
                                                  )}
                                                class="h-4 w-4 rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-400"
                                              />
                                              <span
                                                class={item.checked
                                                  ? "line-through text-slate-500"
                                                  : ""}
                                              >
                                                {item.text}
                                              </span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <p class="text-xs uppercase tracking-[0.18em] text-slate-500">
                                        Status
                                      </p>
                                      <select
                                        id={`column-select-${task.id}`}
                                        class="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                                        value={task.colId}
                                        onChange={(e) =>
                                          moveTaskToColumn(
                                            task.id,
                                            row.id,
                                            e.currentTarget.value,
                                          )}
                                      >
                                        {columns.map((option) => (
                                          <option
                                            key={option.id}
                                            value={option.id}
                                          >
                                            {option.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}
