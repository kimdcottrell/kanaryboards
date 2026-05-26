import { vi } from "vitest";
import type { Task, Row, Column, TaskDraft } from "@components/context/types.ts";

export const mockRow: Row = { id: "row-1", name: "Feature", color: "#ff6b6b" };
export const mockColumn: Column = { id: "col-1", name: "To Do" };
export const secondColumn: Column = { id: "col-2", name: "In Progress" };
export const secondRow: Row = { id: "row-2", name: "Backend", color: "#4ecdc4" };

export const mockTask: Task = {
  id: "task-1",
  rowId: "row-1",
  colId: "col-1",
  title: "Test task",
  description: "",
  checklist: [],
};

export const mockTaskDraft: TaskDraft = {
  title: "",
  description: "",
  checklist: [],
  rowId: "row-1",
  colId: "col-1",
};

export function makeBaseBoardState() {
  return {
    startEditTask: vi.fn(),
    handleDragEnd: vi.fn(),
    handleTaskDragStart: vi.fn(() => vi.fn()),
    toggleTaskChecklist: vi.fn(),
    taskCreateModalOpen: false,
    taskDraft: mockTaskDraft,
    setTaskDraft: vi.fn(),
    createTask: vi.fn(),
    closeTaskCreateModal: vi.fn(),
    addChecklistItem: vi.fn(),
    updateChecklistItem: vi.fn(),
    deleteChecklistItem: vi.fn(),
    handleChecklistKeyDown: vi.fn(),
    setChecklistInputRef: vi.fn(),
    checklistPrompt: "",
    checklistPreview: [] as string[],
    isGeneratingChecklist: false,
    checklistModalError: "",
    setChecklistPrompt: vi.fn(),
    generateChecklistItems: vi.fn(),
    applyChecklistPreviewToDraft: vi.fn(),
    applyChecklistPreview: vi.fn(),
    clearChecklistPreview: vi.fn(),
    taskEditModalOpen: false,
    editTaskDraft: null,
    columns: [mockColumn],
    rows: [mockRow],
    cancelEditTask: vi.fn(),
    saveTaskEdit: vi.fn(),
    deleteTask: vi.fn(),
    setEditTaskDraft: vi.fn(),
    addEditChecklistItem: vi.fn(),
    updateEditChecklistItem: vi.fn(),
    deleteEditChecklistItem: vi.fn(),
  };
}
