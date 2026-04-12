import { useEffect, useRef, useState } from "preact/hooks";
import { computed, signal } from "@preact/signals";
import Modal from "./Modal.jsx";

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
  { label: "base", value: "#64748b" },
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

  const rows = signal(persistedState?.rows || defaultRows);
  const defaultColumnNames = signal(initialDefaultColumns);
  const columns = signal(
    persistedState?.columns ||
      initialDefaultColumns.map((name) => ({ id: createId(), name })),
  );
  const tasks = signal(persistedState?.tasks || defaultTasks);

  const updateRows = (updater) => {
    rows.value = typeof updater === "function" ? updater(rows.value) : updater;
  };

  const updateColumns = (updater) => {
    columns.value = typeof updater === "function"
      ? updater(columns.value)
      : updater;
  };

  const updateTasks = (updater) => {
    tasks.value = typeof updater === "function"
      ? updater(tasks.value)
      : updater;
  };

  const updateDefaultColumnNames = (updater) => {
    defaultColumnNames.value = typeof updater === "function"
      ? updater(defaultColumnNames.value)
      : updater;
  };

  const [newRowName, setNewRowName] = useState("");
  const [newRowPrompt, setNewRowPrompt] = useState("");
  const [taskGenerationStatus, setTaskGenerationStatus] = useState("");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [defaultColumnInput, setDefaultColumnInput] = useState("");
  const [taskFormCell, setTaskFormCell] = useState(null);
  const [taskDraft, setTaskDraft] = useState(emptyTaskDraft("row-1", "col-1"));
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskDraft, setEditTaskDraft] = useState(null);
  const [taskEditModalOpen, setTaskEditModalOpen] = useState(false);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistModalTaskId, setChecklistModalTaskId] = useState(null);
  const [checklistPrompt, setChecklistPrompt] = useState("");
  const [checklistPreview, setChecklistPreview] = useState([]);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [checklistModalError, setChecklistModalError] = useState("");
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingRowName, setEditingRowName] = useState("");
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedDefaultIndex, setDraggedDefaultIndex] = useState(null);
  const checklistInputRefs = useRef({});

  const tasksByCell = computed(() => {
    const grouped = {};
    tasks.value.forEach((task) => {
      const key = `${task.rowId}|${task.colId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });
    return grouped;
  });

  const findTodoColumnId = () => {
    const todoColumn = columns.value.find((column) =>
      column.name.toLowerCase().trim() === "todo"
    );
    return todoColumn?.id || columns.value[0]?.id;
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
          .trim()
      )
      .filter(Boolean)
      .slice(0, 10);

  const generateTasksForRow = async (rowId) => {
    const prompt = newRowPrompt.trim();
    if (!prompt) return;

    setIsGeneratingTasks(true);
    setTaskGenerationStatus("Generating tasks.value...");

    try {
      const response = await fetch("/api/generate-tasks.value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTasks: 10 }),
      });

      if (!response.ok) {
        throw new Error("Task generation failed");
      }

      const data = await response.json();
      const titles = Array.isArray(data.tasks.value)
        ? data.tasks.value.map((task) => String(task).trim())
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
        updateTasks((prev) => [...generatedTasks, ...prev]);
        setTaskGenerationStatus(
          `Added ${generatedTasks.length} task${
            generatedTasks.length > 1 ? "s" : ""
          } to Todo`,
        );
        setNewRowPrompt("");
      } else {
        setTaskGenerationStatus("No tasks.value were generated.");
      }
    } catch (error) {
      console.error(error);
      setTaskGenerationStatus(
        "Unable to generate tasks.value. Please check your Deepseek configuration.",
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
    updateRows([...rows, row]);
    setNewRowName("");

    if (newRowPrompt.trim()) {
      await generateTasksForRow(row.id);
    }
  };

  const updateColumnsFromDefaultNames = (nextNames) => {
    updateDefaultColumnNames(nextNames);
    updateColumns((prevColumns) => {
      const nextColumns = nextNames.map((name) => {
        const existing = prevColumns.find((column) => column.name === name);
        return existing || { id: createId(), name };
      });
      const nextColumnIds = nextColumns.map((column) => column.id);
      updateTasks((prevTasks) =>
        prevTasks.filter((task) => nextColumnIds.includes(task.colId))
      );
      return nextColumns;
    });
  };

  const addDefaultColumn = (name) => {
    const trimmed = name.trim();
    if (!trimmed || defaultColumnNames.value.includes(trimmed)) return;
    updateColumnsFromDefaultNames([...defaultColumnNames.value, trimmed]);
    setDefaultColumnInput("");
  };

  const removeDefaultColumn = (name) => {
    updateColumnsFromDefaultNames(
      defaultColumnNames.value.filter((columnName) => columnName !== name),
    );
  };

  const moveDefaultColumn = (fromIndex, toIndex) => {
    const nextNames = [...defaultColumnNames.value];
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
      toIndex >= rows.value.length
    ) return;
    const nextRows = [...rows.value];
    const [moved] = nextRows.splice(fromIndex, 1);
    nextRows.splice(toIndex, 0, moved);
    updateRows(nextRows);
  };

  const moveRowUp = (index) => moveRow(index, index - 1);
  const moveRowDown = (index) => moveRow(index, index + 1);

  const deleteColumn = (columnId) => {
    updateColumns(columns.filter((column) => column.id !== columnId));
    updateTasks(tasks.filter((task) => task.colId !== columnId));
    if (taskFormCell?.colId === columnId) {
      setTaskFormCell(null);
    }
    if (editingTaskId) {
      const editingTask = tasks.value.find((task) => task.id === editingTaskId);
      if (editingTask?.colId === columnId) {
        setEditingTaskId(null);
        setEditTaskDraft(null);
      }
    }
  };

  const deleteRow = (rowId) => {
    updateRows(rows.filter((row) => row.id !== rowId));
    updateTasks(tasks.filter((task) => task.rowId !== rowId));
    if (taskFormCell?.rowId === rowId) {
      setTaskFormCell(null);
    }
    if (editingTaskId) {
      const editingTask = tasks.value.find((task) => task.id === editingTaskId);
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
    updateRows(
      rows.value.map((row) => (row.id === rowId ? { ...row, color } : row)),
    );
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
    updateRows(
      rows.value.map((
        row,
      ) => (row.id === rowId ? { ...row, name: trimmed } : row)),
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
    updateRows(defaultRows);
    updateColumns(
      defaultColumnNames.value.map((name) => ({ id: createId(), name })),
    );
    updateTasks(defaultTasks);
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
    updateTasks([
      {
        id: createId(),
        rowId: taskDraft.rowId,
        colId: taskDraft.colId,
        title: taskDraft.title.trim(),
        description: taskDraft.description.trim(),
        checklist: taskDraft.checklist.filter((item) => item.text.trim()),
      },
      ...tasks.value,
    ]);
    closeTaskForm();
  };

  const toggleTaskChecklist = (taskId, itemId) => {
    updateTasks(
      tasks.value.map((task) => {
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
    setTaskEditModalOpen(true);
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditTaskDraft(null);
    setTaskEditModalOpen(false);
  };

  const checklistModalTask = computed(() => {
    return tasks.value.find((task) => task.id === checklistModalTaskId) || null;
  });

  const checklistPlaceholder = checklistModalTask.value?.title || "";

  const openChecklistModal = (task) => {
    setChecklistModalTaskId(task.id);
    setChecklistPrompt("");
    setChecklistPreview([]);
    setChecklistModalError("");
    setChecklistModalOpen(true);
  };

  const closeChecklistModal = () => {
    setChecklistModalOpen(false);
    setChecklistModalTaskId(null);
    setChecklistPrompt("");
    setChecklistPreview([]);
    setChecklistModalError("");
  };

  const generateChecklistItems = async () => {
    const prompt = checklistPrompt.trim() || checklistPlaceholder;
    if (!prompt) return;

    setIsGeneratingChecklist(true);
    setChecklistModalError("");

    try {
      const response = await fetch("/api/generate-tasks.value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            `Create 5-10 concise checklist item titles for the following task: ${prompt}`,
          maxTasks: 10,
        }),
      });

      if (!response.ok) {
        throw new Error("Checklist generation failed");
      }

      const data = await response.json();
      const titles = Array.isArray(data.tasks.value)
        ? data.tasks.value.map((task) => String(task).trim())
        : [];
      const items = parseGeneratedTasks(titles.join("\n")).slice(0, 10);
      setChecklistPreview(items);

      if (items.length === 0) {
        setChecklistModalError("No checklist items were generated.");
      }
    } catch (error) {
      console.error(error);
      setChecklistModalError(
        "Unable to generate checklist items. Please check your AI configuration.",
      );
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const applyChecklistPreview = () => {
    if (!checklistModalTaskId || checklistPreview.length === 0) return;

    updateTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === checklistModalTaskId
          ? {
            ...task,
            checklist: checklistPreview.map((text) => ({
              id: createId(),
              text,
              checked: false,
            })),
          }
          : task
      )
    );

    if (editingTaskId === checklistModalTaskId) {
      setEditTaskDraft((prevDraft) =>
        prevDraft && prevDraft.id === checklistModalTaskId
          ? {
            ...prevDraft,
            checklist: checklistPreview.map((text) => ({
              id: createId(),
              text,
              checked: false,
            })),
          }
          : prevDraft
      );
    }

    closeChecklistModal();
  };

  const deleteTask = (taskId) => {
    updateTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    if (editingTaskId === taskId) {
      cancelEditTask();
    }
  };

  const saveTaskEdit = (event) => {
    event.preventDefault();
    if (!editTaskDraft.title.trim()) return;
    updateTasks(
      tasks.value.map((task) =>
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
    updateTasks(
      tasks.value.map((task) => task.id === taskId ? { ...task, colId } : task),
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
      JSON.stringify({
        rows: rows.value,
        columns: columns.value,
        tasks: tasks.value,
        defaultColumnNames: defaultColumnNames.value,
      }),
    );
  }, [rows.value, columns.value, tasks.value, defaultColumnNames.value]);

  return (
    <div class="w-full">
      <header class="m-20 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.3em]">
            Organize your workflow
          </p>
          <h1 class="mt-3 text-4xl font-semibold sm:text-5xl">Kanary Boards</h1>
        </div>
        <p class="max-w-2xl">
          A really basic kanban board project built with Deno, Astro, and
          Tailwind CSS. <br />
          Create rows.value and tasks.value, drag and drop them around as
          needed.<br />
          Generate tasks.value using AI by entering a prompt describing the type
          of tasks.value you want to create, and the AI will return a list of
          tasks.value matching your description.<br />
          Data is only persisted in local browser storage...{" "}
          <em>
            <small>For now.</small>
          </em>
        </p>
      </header>
      <section class="mx-20 rounded bg-base-300 p-4 shadow-xl shadow-base-300/20">
        <div class="navbar flex justify-between items-start gap-4">
          <div class="">
            <h2 class="text-3xl font-semibold">Board Configuration</h2>
            <p class="mt-3 max-w-2xl">
              Add rows.value and columns.value, then place tasks.value into each
              column. Each task can include a title, description, and optional
              checklist.
            </p>
          </div>
          <div class="">
            <button
              type="button"
              class="btn btn-error btn"
              onClick={confirmResetBoard}
            >
              Reset Board
            </button>
          </div>
        </div>
        <div class="rounded mt-6 bg-base-content/8 p-5">
          <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-semibold">
                Default column settings
              </h3>
              <p class="text-sm">
                Manage the default column set used across projects. Drag badges
                to reorder, click x to remove, or add a new default column.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-baseline gap-2">
            {defaultColumnNames.value.map((name, index) => (
              <div class="join">
                <button
                  key={name}
                  draggable="true"
                  onDragStart={handleDefaultColumnDragStart(index)}
                  onDragOver={handleDefaultColumnDragOver}
                  onDrop={handleDefaultColumnDrop(index)}
                  onDragEnd={() => setDraggedDefaultIndex(null)}
                  class="btn join-item btn-accent cursor-grab"
                >
                  {name}
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    removeDefaultColumn(name);
                  }}
                  class="btn join-item btn-accent btn-soft border-accent"
                >
                  <span class="iconify basil--cross-outline text-xl font-bold">
                  </span>
                </button>
              </div>
            ))}
            <fieldset class="fieldset">
              <input
                class="input input-accent"
                type="text"
                value={defaultColumnInput}
                onInput={(e) => setDefaultColumnInput(e.currentTarget.value)}
                onKeyDown={handleDefaultColumnInputKeyDown}
                placeholder="Add new column"
              />
              <p class="label">Hit enter to create</p>
            </fieldset>
          </div>
        </div>
        <div class="rounded bg-base-content/8 mt-6 p-5">
          <h3 class="text-lg font-semibold">Create a new row</h3>
          <form
            class="space-y-4"
            onSubmit={addRow}
          >
            <fieldset class="fieldset w-auto">
              <label class="fieldset-legend">
                What should the row be named?
              </label>
              <input
                class="input input-secondary w-full validator"
                type="text"
                value={newRowName}
                onInput={(e) => setNewRowName(e.currentTarget.value)}
                placeholder="A project name, a category for large project tasks.value, etc."
                required
              />
              <span class="validator-hint hidden">Required</span>

              <label class="fieldset-legend" htmlFor="newRowPrompt">
                Generate up to 10 tasks.value using AI
              </label>
              <input
                id="newRowPrompt"
                class="input w-full input-secondary"
                type="text"
                value={newRowPrompt}
                onInput={(e) => setNewRowPrompt(e.currentTarget.value)}
                placeholder="Enter a brief description of tasks.value to generate"
              />
            </fieldset>
            <button
              class="btn btn-secondary mt-4"
              type="submit"
              disabled={isGeneratingTasks}
            >
              {isGeneratingTasks ? taskGenerationStatus : "Add Row"}
            </button>
          </form>
        </div>
        <div class="mt-6 rounded bg-base-content/8 p-5">
          <div class="mb-4 flex gap-4 flex-row items-baseline justify-between">
            <div>
              <h3 class="text-lg font-semibold">
                Row settings
              </h3>
              <p class="text-sm">
                Use the arrow buttons to move rows.value up or down and pick a
                color for each project row.
              </p>
            </div>
          </div>
          <div class="overflow-x-auto">
            <ul class="list rounded space-y-2 shadow-md">
              {rows.value.map((row, index) => (
                <li
                  key={row.id}
                  class="grid grid-cols-3 list-row gap-3 border"
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
                      class="max-w-xs rounded border px-3 py-1 text-sm outline-none"
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
                      class={`btn btn-square btn-ghost ${
                        index === 0 ? "hidden" : ""
                      }`}
                      style={{ color: row.color, borderColor: row.color }}
                      disabled={index === 0}
                      onClick={() => moveRowUp(index)}
                      aria-label={`Move ${row.name} up`}
                    >
                      ⌃
                    </button>
                    <button
                      type="button"
                      class={`btn btn-square btn-ghost ${
                        index === rows.value.length - 1 ? "hidden" : ""
                      }`}
                      style={{ color: row.color, borderColor: row.color }}
                      disabled={index === rows.value.length - 1}
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
        {rows.value.map((row) => (
          <section
            key={row.id}
            class="space-y-4 rounded p-5 shadow-lg shadow-base-300/10"
            style={{
              backgroundColor: `${row.color}1a`,
            }}
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {editingRowId === row.id
                  ? (
                    <input
                      class="w-full rounded border border-base-300 px-4 py-2 text-2xl font-semibold outline-none focus:border-cyan-500"
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
                      class="text-2xl font-semibold"
                      onDblClick={() => editRowTitle(row)}
                    >
                      {row.name}
                      <span
                        data-tip="double click to edit"
                        class="tooltip text-xs align-super pl-2"
                        style={{
                          color: `${row.color}`,
                        }}
                      >
                        <span class="iconify hugeicons--pencil-edit-02 text-xl">
                        </span>
                      </span>
                    </h3>
                  )}
              </div>
              <div class="flex flex-col gap-3 sm:items-end">
                <button
                  type="button"
                  class="btn btn-error btn-square btn-sm opacity-80 hover:opacity-100 text-xl"
                  onClick={() => deleteRow(row.id)}
                  aria-label={`Delete project ${row.name}`}
                >
                  <span class="iconify basil--cross-outline text-xl"></span>
                </button>
              </div>
            </div>

            <div class="overflow-x-auto pb-4">
              <div class="flex gap-5">
                {columns.value.map((column) => {
                  const cellKey = `${row.id}|${column.id}`;
                  const cellTasks = tasksByCell.value[cellKey] || [];
                  const isActiveForm = taskFormCell &&
                    taskFormCell.rowId === row.id &&
                    taskFormCell.colId === column.id;

                  return (
                    <div
                      key={column.id}
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
                          <article class="overflow-hidden rounded border border-base-200 p-4 shadow-sm shadow-base-900/5">
                            <form class="space-y-4" onSubmit={createTask}>
                              <div>
                                <label class="block text-sm font-medium">
                                  Title
                                </label>
                                <input
                                  class="mt-2 w-full rounded border border-base-300 px-4 py-2 outline-none focus:border-cyan-500"
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
                                <label class="block text-sm font-medium">
                                  Description
                                </label>
                                <textarea
                                  class="mt-2 h-24 w-full rounded border border-base-300 px-4 py-2 outline-none focus:border-cyan-500"
                                  value={taskDraft.description}
                                  onInput={(e) =>
                                    setTaskDraft({
                                      ...taskDraft,
                                      description: e.currentTarget.value,
                                    })}
                                />
                              </div>
                              <div class="space-y-3 rounded border border-base-300 p-4">
                                <div class="flex items-center justify-between gap-3">
                                  <p class="text-sm font-semibold">
                                    Checklist items
                                  </p>
                                  <button
                                    type="button"
                                    class="rounded px-3 py-1 text-sm transition"
                                    onClick={() => addChecklistItem(true)}
                                  >
                                    Add item
                                  </button>
                                </div>
                                <div class="space-y-3">
                                  {taskDraft.checklist.map((item, index) => (
                                    <div
                                      key={item.id}
                                      class="flex items-center gap-3 rounded border border-base-300 px-3 py-2"
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
                                        class="h-4 w-4 rounded border-base-300 focus:ring-cyan-400"
                                      />
                                      <input
                                        class="w-full bg-transparent outline-none placeholder:"
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
                                  class="rounded px-4 py-2 text-sm transition"
                                  onClick={closeTaskForm}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  class="rounded px-4 py-2 text-sm font-semibold transition"
                                >
                                  Create task
                                </button>
                              </div>
                            </form>
                          </article>
                        )}
                        {cellTasks.map((task) => {
                          const isEditing = task.id === editingTaskId;

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
                              class="overflow-hidden rounded shadow-sm shadow-base-900/5"
                            >
                              <div class="block">
                                <div class="join-item bg-neutral-800/80 p-4">
                                  <div class="flex items-center justify-between gap-3">
                                    <h5 class="text-base font-semibold">
                                      {task.title}
                                    </h5>
                                    <button
                                      type="button"
                                      class="btn btn-sm btn-soft btn-accent text-md transition"
                                      onClick={() => startEditTask(task)}
                                    >
                                      <span class="iconify hugeicons--pencil-edit-02 text-xl">
                                      </span>
                                    </button>
                                  </div>
                                </div>
                                {task.description && (
                                  <div class="bg-neutral-800/40 p-4">
                                    <p class="text-xs uppercase tracking-[0.18em]">
                                      Description
                                    </p>
                                    <p class="mt-1 text-sm">
                                      {task.description}
                                    </p>
                                  </div>
                                )}

                                {task.checklist &&
                                  task.checklist.length > 0 && (
                                  <div class="space-y-2 bg-neutral-800/40 p-4">
                                    <p class="text-xs uppercase tracking-[0.18em]">
                                      Checklist
                                    </p>
                                    <div class="space-y-2">
                                      {task.checklist.map((item) => (
                                        <label
                                          key={item.id}
                                          class="flex items-center gap-2 text-sm"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={item.checked}
                                            onInput={() =>
                                              toggleTaskChecklist(
                                                task.id,
                                                item.id,
                                              )}
                                            class="h-4 w-4 rounded border-base-300 focus:ring-cyan-400"
                                          />
                                          <span
                                            class={item.checked
                                              ? "line-through "
                                              : ""}
                                          >
                                            {item.text}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
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

      <Modal open={checklistModalOpen} onClose={closeChecklistModal}>
        <h3 class="text-xl font-semibold">
          What task do you want broken down?
        </h3>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <input
              class="w-full rounded border border-base-300 px-4 py-3 outline-none focus:border-cyan-500"
              type="text"
              value={checklistPrompt}
              placeholder={checklistPlaceholder}
              onInput={(e) => setChecklistPrompt(e.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  generateChecklistItems();
                }
                if (event.key === "Tab" && !checklistPrompt.trim()) {
                  event.preventDefault();
                  setChecklistPrompt(checklistPlaceholder);
                }
              }}
            />
            <p class="text-xs">
              Press Tab to fill the textbox with the task title placeholder.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded px-4 py-2 text-sm font-semibold transition"
              onClick={generateChecklistItems}
              disabled={isGeneratingChecklist}
            >
              {isGeneratingChecklist
                ? "Generating…"
                : "Generate Checklist Items"}
            </button>
            <button
              type="button"
              class="rounded px-4 py-2 text-sm font-semibold transition hover:"
              onClick={applyChecklistPreview}
              disabled={checklistPreview.length === 0}
            >
              Copy checklist items
            </button>
          </div>
          {checklistModalError && <p class="text-sm">{checklistModalError}</p>}
          <div class="overflow-x-auto">
            {checklistPreview.length > 0
              ? (
                <table class="table w-full">
                  <thead>
                    <tr>
                      <th class="text-left">#</th>
                      <th class="text-left">Checklist item preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklistPreview.map((item, index) => (
                      <tr key={`${item}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{item}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
              : (
                <p class="text-sm">
                  Generate checklist items to preview them here.
                </p>
              )}
          </div>
        </div>
      </Modal>

      <Modal open={taskEditModalOpen} onClose={cancelEditTask}>
        <h3 class="text-xl font-semibold">Edit task</h3>
        {editTaskDraft
          ? (
            <form class="mt-4 space-y-4" onSubmit={saveTaskEdit}>
              <div>
                <label class="block text-sm font-medium">
                  Title
                </label>
                <input
                  class="mt-2 w-full rounded border border-base-300 px-4 py-2 outline-none focus:border-cyan-500"
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
              <div>
                <label class="block text-sm font-medium">
                  Description
                </label>
                <textarea
                  class="mt-2 h-24 w-full rounded border border-base-300 px-4 py-2 outline-none focus:border-cyan-500"
                  value={editTaskDraft.description}
                  onInput={(e) =>
                    setEditTaskDraft({
                      ...editTaskDraft,
                      description: e.currentTarget.value,
                    })}
                />
              </div>
              <div>
                <p class="text-xs uppercase tracking-[0.18em]">
                  Status
                </p>
                <select
                  id={`edit-column-select-${editTaskDraft.id}`}
                  class="mt-2 w-full rounded border border-base-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                  value={editTaskDraft.colId}
                  onChange={(e) =>
                    setEditTaskDraft({
                      ...editTaskDraft,
                      colId: e.currentTarget.value,
                    })}
                >
                  {columns.value.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p class="text-xs uppercase tracking-[0.18em]">
                  Row
                </p>
                <select
                  id={`edit-row-select-${editTaskDraft.id}`}
                  class="mt-2 w-full rounded border border-base-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                  value={editTaskDraft.rowId}
                  onChange={(e) =>
                    setEditTaskDraft({
                      ...editTaskDraft,
                      rowId: e.currentTarget.value,
                    })}
                >
                  {rows.value.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div class="space-y-3 rounded border border-base-300 p-4">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-semibold">
                    Checklist items
                  </p>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="rounded px-3 py-1 text-sm transition"
                      onClick={() => addEditChecklistItem(true)}
                    >
                      Add item
                    </button>
                    <button
                      type="button"
                      class="rounded border border-base-300 px-3 py-1 text-sm transition"
                      onClick={() => openChecklistModal(editTaskDraft)}
                      aria-label="Generate checklist items"
                    >
                      🪄
                    </button>
                  </div>
                </div>
                <div class="space-y-3">
                  {editTaskDraft.checklist.map((item, index) => (
                    <div
                      key={item.id}
                      class="flex items-center gap-3 rounded border border-base-300 px-3 py-2"
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
                        class="h-4 w-4 rounded border-base-300 focus:ring-cyan-400"
                      />
                      <input
                        class="w-full bg-transparent outline-none placeholder:"
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
                        ref={(el) => setChecklistInputRef(item.id, el)}
                        placeholder="Checklist item"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="justify-self-start rounded px-4 py-2 text-sm font-semibold transition"
                  onClick={() => deleteTask(editTaskDraft.id)}
                >
                  Delete
                </button>
                <button
                  type="submit"
                  class="ml-auto rounded px-4 py-2 text-sm font-semibold transition justify-self-end"
                >
                  Save
                </button>
              </div>
            </form>
          )
          : <p class="mt-4 text-sm">Loading task…</p>}
      </Modal>
    </div>
  );
}
