import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mockColumn, mockRow, mockTaskDraft } from "./setup.ts";

vi.mock("@lyfie/luthor", () => ({
  ExtensiveEditor: () =>
    React.createElement("div", { "data-testid": "luthor-editor" }),
}));

import TaskForm from "@components/TaskForm.tsx";

afterEach(() => {
  vi.clearAllMocks();
});

const baseProps = {
  taskDraft: mockTaskDraft,
  columns: [mockColumn],
  rows: [mockRow],
  setTaskDraft: vi.fn(),
  onSubmit: vi.fn(),
  addChecklistItem: vi.fn(),
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  reorderChecklistItem: vi.fn(),
  handleChecklistKeyDown: vi.fn(),
  setChecklistInputRef: vi.fn(),
  checklistPrompt: "",
  checklistPreview: [],
  isGeneratingChecklist: false,
  checklistModalError: "",
  setChecklistPrompt: vi.fn(),
  generateChecklistItems: vi.fn(),
  applyChecklist: vi.fn(),
  clearChecklistPreview: vi.fn(),
};

describe("TaskForm", () => {
  test("title field is marked as required", () => {
    const { container } = render(<TaskForm {...baseProps} />);
    const titleInput = container.querySelector('input[type="text"]');
    expect(titleInput?.hasAttribute("required")).toBe(true);
  });

  test("renders the Luthor editor for description", () => {
    render(<TaskForm {...baseProps} />);
    expect(screen.getByTestId("luthor-editor")).toBeTruthy();
  });

  test("renders checklist section", () => {
    render(<TaskForm {...baseProps} />);
    expect(screen.getByText("Checklist items")).toBeTruthy();
  });

  test("submit button defaults to label 'Create task'", () => {
    render(<TaskForm {...baseProps} />);
    expect(screen.getByRole("button", { name: "Create task" })).toBeTruthy();
  });

  test("submit button uses a custom submitLabel when provided", () => {
    render(<TaskForm {...baseProps} submitLabel="Save" />);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  test("Cancel button is shown when onCancel is provided", () => {
    render(<TaskForm {...baseProps} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  test("Cancel button is absent when onCancel is omitted", () => {
    render(<TaskForm {...baseProps} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  test("Trash button is shown when onTrash is provided", () => {
    render(<TaskForm {...baseProps} onTrash={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Trash" })).toBeTruthy();
  });

  test("Trash button is absent when onTrash is omitted", () => {
    render(<TaskForm {...baseProps} />);
    expect(screen.queryByRole("button", { name: "Trash" })).toBeNull();
  });

  test("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<TaskForm {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("calls onTrash when Trash button is clicked", () => {
    const onTrash = vi.fn();
    render(<TaskForm {...baseProps} onTrash={onTrash} />);
    fireEvent.click(screen.getByRole("button", { name: "Trash" }));
    expect(onTrash).toHaveBeenCalled();
  });
});

describe("TaskForm — Trash", () => {
  const trashColumn = {
    ...mockColumn,
    id: "col-trash",
    title: "Trash",
    isTrash: true,
  };
  const trashedDraft = {
    ...mockTaskDraft,
    id: "task-1",
    title: "Trashed task",
    colId: "col-trash",
    trashedAt: new Date().toISOString(),
    preTrashColId: mockColumn.id,
  };

  test("Status does not offer the Trash column", () => {
    render(<TaskForm {...baseProps} columns={[mockColumn, trashColumn]} />);
    expect(screen.queryByTestId("status-step-col-trash")).toBeNull();
    expect(screen.getByTestId(`status-step-${mockColumn.id}`)).toBeTruthy();
  });

  test("readOnly shows the view-only alert and Restore instead of Trash/Submit", () => {
    const onRestore = vi.fn();
    render(
      <TaskForm
        {...baseProps}
        columns={[mockColumn, trashColumn]}
        taskDraft={trashedDraft}
        readOnly
        onTrash={vi.fn()}
        onRestore={onRestore}
        submitLabel="Save"
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "Task is view-only. Restore it to edit.",
    );
    expect(screen.queryByRole("button", { name: "Trash" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(onRestore).toHaveBeenCalled();
  });

  test("readOnly shows Delete forever, which calls onDelete", () => {
    const onDelete = vi.fn();
    render(
      <TaskForm
        {...baseProps}
        columns={[mockColumn, trashColumn]}
        taskDraft={trashedDraft}
        readOnly
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    expect(onDelete).toHaveBeenCalled();
  });

  test("Delete forever is not shown outside readOnly", () => {
    render(<TaskForm {...baseProps} onTrash={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Delete forever" })).toBeNull();
    expect(screen.getByRole("button", { name: "Trash" })).toBeTruthy();
  });

  test("readOnly selects the pre-trash column in Status", () => {
    const { container } = render(
      <TaskForm
        {...baseProps}
        columns={[mockColumn, trashColumn]}
        taskDraft={trashedDraft}
        readOnly
      />,
    );
    const checked = container.querySelector<HTMLInputElement>(
      'input[type="radio"][value="col-1"]',
    );
    expect(checked?.checked).toBe(true);
  });

  test("readOnly blocks edits to Status, Project and title", () => {
    const setTaskDraft = vi.fn();
    const { container } = render(
      <TaskForm
        {...baseProps}
        columns={[
          mockColumn,
          { ...mockColumn, id: "col-2", title: "Done" },
          trashColumn,
        ]}
        taskDraft={trashedDraft}
        setTaskDraft={setTaskDraft}
        readOnly
      />,
    );
    fireEvent.click(screen.getByTestId("status-step-col-2"));
    fireEvent.click(screen.getByText(mockRow.title));
    const title = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    expect(title.readOnly).toBe(true);
    fireEvent.keyDown(title, { key: "a" });
    expect(setTaskDraft).not.toHaveBeenCalled();
  });
});
