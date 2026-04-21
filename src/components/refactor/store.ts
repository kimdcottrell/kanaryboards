import { useEffect, useMemo, useRef, useState } from "preact/hooks";

const STORAGE_KEY = "claudekan-board-state";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Row {
  id: string;
  name: string;
  color: string;
}

interface Column {
  id: string;
  name: string;
}

interface Task {
  id: string;
  rowId: string;
  colId: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
}

interface TaskDraft {
  title: string;
  description: string;
  checklist: ChecklistItem[];
  rowId: string;
  colId: string;
}

interface DraggedTask {
  taskId: string;
  rowId: string;
  colId: string;
}
const createId = () =>
  `${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;

export const initialDefaultColumnNames = ["todo", "working on it", "done"];

export const rowColorOptions = [
  { label: "Blue", value: "#38bdf8" },
  { label: "Green", value: "#34d399" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#fb7185" },
  { label: "Violet", value: "#a855f7" },
  { label: "base", value: "#64748b" },
];

const defaultRows: Row[] = [];
const defaultTasks: Task[] = [];

const loadPersistedState = () => {
  if (typeof globalThis.localStorage === "undefined") return null;
  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const emptyTaskDraft = (rowId: string, colId: string) => ({
  title: "",
  description: "",
  checklist: [{ id: createId(), text: "", checked: false }],
  rowId,
  colId,
});

export function useBoard() {
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
  const [newRowFormKey, setNewRowFormKey] = useState(0);
  const [taskGenerationStatus, setTaskGenerationStatus] = useState("");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [defaultColumnInput, setDefaultColumnInput] = useState("");
  const [taskCreateModalOpen, setTaskCreateModalOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState(emptyTaskDraft("row-1", "col-1"));
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskDraft, setEditTaskDraft] = useState<Task | null>(null);
  const [taskEditModalOpen, setTaskEditModalOpen] = useState(false);
  const [checklistModalTaskId, setChecklistModalTaskId] = useState<string | null>(null);
  const [checklistPrompt, setChecklistPrompt] = useState("");
  const [checklistPreview, setChecklistPreview] = useState<string[]>([]);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [checklistModalError, setChecklistModalError] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowName, setEditingRowName] = useState("");
  const [draggedTask, setDraggedTask] = useState<DraggedTask | null>(null);
  const [draggedDefaultIndex, setDraggedDefaultIndex] = useState<number | null>(null);
  const checklistInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const tasksByCell = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      const key = `${task.rowId}|${task.colId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });
    return grouped;
  }, [tasks]);

  // Helper functions
  const findTodoColumnId = () => {
    const todoColumn = columns.find((column) =>
      column.name.toLowerCase().trim() === "todo"
    );
    return todoColumn?.id || columns[0]?.id;
  };

  const fetchGeneratedItems = async (prompt: string, maxItems = 10) => {
    const response = await fetch("/api/generate-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTasks: maxItems }),
    });

    if (!response.ok) {
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const titles = Array.isArray(data.response)
      ? data.response.map((item) => String(item).trim())
      : [];

    return titles;
  };

  // Column management handlers
  const updateColumnsFromDefaultNames = (nextNames: string[]) => {
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

  const addDefaultColumn = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || defaultColumnNames.includes(trimmed)) return;
    updateColumnsFromDefaultNames([...defaultColumnNames, trimmed]);
    setDefaultColumnInput("");
  };

  const removeDefaultColumn = (name: string) => {
    updateColumnsFromDefaultNames(
      defaultColumnNames.filter((columnName) => columnName !== name),
    );
  };

  const moveDefaultColumn = (fromIndex: number, toIndex: number) => {
    const nextNames = [...defaultColumnNames];
    const [moved] = nextNames.splice(fromIndex, 1);
    nextNames.splice(toIndex, 0, moved);
    updateColumnsFromDefaultNames(nextNames);
  };

  const handleDefaultColumnInputKeyDown = (
    event: KeyboardEvent,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDefaultColumn(defaultColumnInput);
    }
  };

  const handleNewRowPromptKeyDown = (
    event: KeyboardEvent,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const rowId = rows[0]?.id;
      if (rowId && newRowPrompt.trim()) {
        generateTasksForRow(rowId);
      }
    }
  };

  const handleDefaultColumnDragStart = (index: number) => (
    event: DragEvent,
  ) => {
    setDraggedDefaultIndex(index);
    event.dataTransfer!.effectAllowed = "move";
    event.dataTransfer!.setData("text/plain", index.toString());
  };

  const handleDefaultColumnDragOver = (event: DragEvent) => {
    event.preventDefault();
  };

  const handleDefaultColumnDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault();
    const fromIndex = draggedDefaultIndex !== null
      ? draggedDefaultIndex
      : Number(event.dataTransfer?.getData("text/plain"));
    if (fromIndex === index || Number.isNaN(fromIndex)) return;
    moveDefaultColumn(fromIndex, index);
    setDraggedDefaultIndex(null);
  };

  const deleteColumn = (columnId: string) => {
    setColumns(columns.filter((column) => column.id !== columnId));
    setTasks(tasks.filter((task) => task.colId !== columnId));
    if (taskCreateModalOpen && taskDraft?.colId === columnId) {
      setTaskCreateModalOpen(false);
    }
    if (editingTaskId) {
      const editingTask = tasks.find((task) => task.id === editingTaskId);
      if (editingTask?.colId === columnId) {
        setEditingTaskId(null);
        setEditTaskDraft(null);
      }
    }
  };

  // Row management handlers
  const moveRow = (fromIndex: number, toIndex: number) => {
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

  const moveRowUp = (index: number) => moveRow(index, index - 1);
  const moveRowDown = (index: number) => moveRow(index, index + 1);

  const deleteRow = (rowId: string) => {
    setRows(rows.filter((row) => row.id !== rowId));
    setTasks(tasks.filter((task) => task.rowId !== rowId));
    if (taskCreateModalOpen && taskDraft?.rowId === rowId) {
      setTaskCreateModalOpen(false);
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

  const updateRowColor = (rowId: string, color: string) => {
    setRows(rows.map((row) => (row.id === rowId ? { ...row, color } : row)));
  };

  const editRowTitle = (row: Row) => {
    setEditingRowId(row.id);
    setEditingRowName(row.name);
  };

  const saveRowTitle = (rowId: string) => {
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

  const addRow = async (event: Event) => {
    event.preventDefault();
    if (!newRowName.trim()) return;
    const row = {
      id: createId(),
      name: newRowName.trim(),
      color: rowColorOptions[0].value,
    };
    setRows([...rows, row]);

    if (newRowPrompt.trim()) {
      await generateTasksForRow(row.id);
    } else {
      setNewRowName("");
      setNewRowFormKey((k) => k + 1);
    }
  };

  // Task management handlers
  const openTaskForm = (rowId: string, colId: string) => {
    setTaskDraft(emptyTaskDraft(rowId, colId));
    resetChecklistGenerationState();
    setTaskCreateModalOpen(true);
  };

  const closeTaskCreateModal = () => {
    setTaskCreateModalOpen(false);
    resetChecklistGenerationState();
  };

  const createTask = (event: Event) => {
    event.preventDefault();
    if (!taskDraft.title.trim()) return;
    setTasks([
      {
        id: createId(),
        rowId: taskDraft.rowId,
        colId: taskDraft.colId,
        title: taskDraft.title.trim(),
        description: taskDraft.description.trim(),
        checklist: taskDraft.checklist.filter((item: ChecklistItem) => item.text.trim()),
      },
      ...tasks,
    ]);
    closeTaskCreateModal();
  };

  const startEditTask = (task: Task) => {
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

  const deleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    if (editingTaskId === taskId) {
      cancelEditTask();
    }
  };

  const saveTaskEdit = (event: Event) => {
    event.preventDefault();
    if (!editTaskDraft?.title.trim()) return;
    setTasks(
      tasks.map((task) =>
        task.id === editingTaskId
          ? {
            ...task,
            title: editTaskDraft!.title.trim(),
            description: editTaskDraft!.description.trim(),
            rowId: editTaskDraft!.rowId,
            colId: editTaskDraft!.colId,
            checklist: editTaskDraft!.checklist.filter((item: ChecklistItem) =>
              item.text.trim()
            ),
          }
          : task
      ),
    );
    cancelEditTask();
  };

  const toggleTaskChecklist = (taskId: string, itemId: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          checklist: task.checklist.map((item: ChecklistItem) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        };
      }),
    );
  };

  const moveTaskToColumn = (taskId: string, colId: string) => {
    setTasks(
      tasks.map((task) => task.id === taskId ? { ...task, colId } : task),
    );
  };

  const handleDragStart = (
    task: Task,
    rowId: string,
    colId: string,
    event: DragEvent,
  ) => {
    setDraggedTask({ taskId: task.id, rowId, colId });
    event.dataTransfer!.effectAllowed = "move";
    event.dataTransfer!.setData("text/plain", task.id);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleColumnDrop = (rowId: string, colId: string) => (
    event: DragEvent,
  ) => {
    event.preventDefault();
    if (!draggedTask) return;
    if (draggedTask.rowId !== rowId) return;
    if (draggedTask.colId === colId) return;
    moveTaskToColumn(draggedTask.taskId, colId);
    setDraggedTask(null);
  };

  // Checklist management handlers
  const setChecklistInputRef = (id: string, element: HTMLInputElement | null) => {
    if (element) {
      checklistInputRefs.current[id] = element;
    } else {
      delete checklistInputRefs.current[id];
    }
  };

  const addChecklistItem = (focusNew = false, insertBeforeIndex?: number) => {
    const newItem = { id: createId(), text: "", checked: false };
    setTaskDraft((prev) => {
      const list = [...prev.checklist];
      if (insertBeforeIndex !== undefined) {
        list.splice(insertBeforeIndex, 0, newItem);
      } else {
        list.unshift(newItem);
      }
      return { ...prev, checklist: list };
    });
    if (focusNew) {
      setTimeout(() => {
        checklistInputRefs.current[newItem.id]?.focus();
      }, 0);
    }
  };

  const addEditChecklistItem = (focusNew = false, insertBeforeIndex?: number) => {
    const newItem = { id: createId(), text: "", checked: false };
    setEditTaskDraft((prev) => {
      if (!prev) return prev;
      const list = [...prev.checklist];
      if (insertBeforeIndex !== undefined) {
        list.splice(insertBeforeIndex, 0, newItem);
      } else {
        list.unshift(newItem);
      }
      return { ...prev, checklist: list };
    });
    if (focusNew) {
      setTimeout(() => {
        checklistInputRefs.current[newItem.id]?.focus();
      }, 0);
    }
  };

  const updateChecklistItem = (id: string, field: string, value: string | boolean) => {
    setTaskDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item: ChecklistItem) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const updateEditChecklistItem = (id: string, field: string, value: string | boolean) => {
    setEditTaskDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklist: prev.checklist.map((item: ChecklistItem) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      };
    });
  };

  const removeChecklistItem = <T extends { checklist: ChecklistItem[] }>(prev: T, id: string): T => ({
    ...prev,
    checklist: prev.checklist.filter((item) => item.id !== id),
  });

  const deleteChecklistItem = (id: string) => {
    setTaskDraft((prev) => removeChecklistItem(prev, id));
  };

  const deleteEditChecklistItem = (id: string) => {
    setEditTaskDraft((prev) => prev && removeChecklistItem(prev, id));
  };

  const handleChecklistKeyDown = (
    event: KeyboardEvent,
    index: number,
    addItemFn: (focusNew: boolean, insertBeforeIndex?: number) => void,
  ) => {
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      addItemFn(true, index);
    } else if (event.key === "Enter") {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    }
  };

  // AI generation handlers
  const generateTasksForRow = async (rowId: string) => {
    const prompt = newRowPrompt.trim();
    if (!prompt) return;

    setIsGeneratingTasks(true);
    setTaskGenerationStatus("Generating tasks...");

    try {
      const parsedTasks = await fetchGeneratedItems(prompt, 10);
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
          `Added ${generatedTasks.length} task${generatedTasks.length > 1 ? "s" : ""
          } to Todo`,
        );
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
      setNewRowName("");
      setNewRowPrompt("");
      setNewRowFormKey((k) => k + 1);
    }
  };

  const resetChecklistGenerationState = () => {
    setChecklistModalTaskId(null);
    setChecklistPrompt("");
    setChecklistPreview([]);
    setChecklistModalError("");
  };

  const generateChecklistItems = async (task?: Task) => {
    const taskTitle = task?.title || "Break down this task...";
    // If a task is passed, set it as the modal task (for applying items)
    if (task?.id) {
      setChecklistModalTaskId(task.id);
    }
    const prompt = checklistPrompt.trim() || taskTitle;
    if (!prompt) return;

    setIsGeneratingChecklist(true);
    setChecklistModalError("");

    try {
      const items = await fetchGeneratedItems(prompt, 10);
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

    if (editingTaskId === checklistModalTaskId) {
      setEditTaskDraft((prevDraft) =>
        prevDraft && prevDraft.id === checklistModalTaskId
          ? {
            ...prevDraft,
            checklist: [
              ...prevDraft.checklist,
              ...checklistPreview.map((text) => ({
                id: createId(),
                text,
                checked: false,
              })),
            ],
          }
          : prevDraft
      );
    }

    resetChecklistGenerationState();
  };

  const applyChecklistPreviewToDraft = () => {
    if (checklistPreview.length === 0) return;

    setTaskDraft((prevDraft) => ({
      ...prevDraft,
      checklist: [
        ...prevDraft.checklist,
        ...checklistPreview.map((text) => ({
          id: createId(),
          text,
          checked: false,
        })),
      ],
    }));
  };

  // Board reset handlers
  const resetBoard = () => {
    setRows(defaultRows);
    setColumns(
      defaultColumnNames.map((name) => ({ id: createId(), name })),
    );
    setTasks(defaultTasks);
    setTaskCreateModalOpen(false);
    setEditingTaskId(null);
    setEditTaskDraft(null);
    setNewRowName("");
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const confirmResetBoard = () => {
    if (typeof globalThis.confirm === "undefined") return;
    const confirmed = globalThis.confirm(
      "Reset the board? This will clear all projects and cards.",
    );
    if (confirmed) {
      resetBoard();
    }
  };

  // Persistence
  useEffect(() => {
    if (typeof globalThis.localStorage === "undefined") return;
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rows, columns, tasks, defaultColumnNames }),
    );
  }, [rows, columns, tasks, defaultColumnNames]);

  // Return everything needed by components
  return {
    // State - Data
    rows,
    columns,
    tasks,
    tasksByCell,
    defaultColumnNames,
    // State - UI
    newRowName,
    newRowPrompt,
    newRowFormKey,
    taskGenerationStatus,
    isGeneratingTasks,
    defaultColumnInput,
    taskCreateModalOpen,
    taskDraft,
    editingTaskId,
    editTaskDraft,
    taskEditModalOpen,
    checklistModalTaskId,
    checklistPrompt,
    checklistPreview,
    isGeneratingChecklist,
    checklistModalError,
    editingRowId,
    editingRowName,
    draggedTask,
    draggedDefaultIndex,
    // State setters
    setRows,
    setColumns,
    setTasks,
    setDefaultColumnNames,
    setNewRowName,
    setNewRowPrompt,
    setTaskGenerationStatus,
    setIsGeneratingTasks,
    setDefaultColumnInput,
    setTaskCreateModalOpen,
    setTaskDraft,
    setEditingTaskId,
    setEditTaskDraft,
    setTaskEditModalOpen,
    setChecklistModalTaskId,
    setChecklistPrompt,
    setChecklistPreview,
    setIsGeneratingChecklist,
    setChecklistModalError,
    setEditingRowName,
    setChecklistInputRef,
    // Handlers - Columns
    updateColumnsFromDefaultNames,
    addDefaultColumn,
    removeDefaultColumn,
    moveDefaultColumn,
    handleDefaultColumnInputKeyDown,
    handleDefaultColumnDragStart,
    handleDefaultColumnDragOver,
    handleDefaultColumnDrop,
    deleteColumn,
    handleNewRowPromptKeyDown,
    // Handlers - Rows
    moveRow,
    moveRowUp,
    moveRowDown,
    deleteRow,
    updateRowColor,
    editRowTitle,
    saveRowTitle,
    addRow,
    // Handlers - Tasks
    openTaskForm,
    closeTaskCreateModal,
    createTask,
    startEditTask,
    cancelEditTask,
    deleteTask,
    saveTaskEdit,
    toggleTaskChecklist,
    moveTaskToColumn,
    handleDragStart,
    handleDragEnd,
    handleColumnDrop,
    // Handlers - Checklist
    addChecklistItem,
    addEditChecklistItem,
    updateChecklistItem,
    updateEditChecklistItem,
    deleteChecklistItem,
    deleteEditChecklistItem,
    handleChecklistKeyDown,
    generateChecklistItems,
    applyChecklistPreview,
    applyChecklistPreviewToDraft,
    // Handlers - AI
    generateTasksForRow,
    // Handlers - Board
    resetBoard,
    confirmResetBoard,
  };
}
