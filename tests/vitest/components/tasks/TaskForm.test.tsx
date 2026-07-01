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

  test("description fieldset is labeled Optional", () => {
    render(<TaskForm {...baseProps} />);
    expect(screen.getByText("Optional")).toBeTruthy();
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

  test("Delete button is shown when onDelete is provided", () => {
    render(<TaskForm {...baseProps} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
  });

  test("Delete button is absent when onDelete is omitted", () => {
    render(<TaskForm {...baseProps} />);
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  test("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<TaskForm {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("calls onDelete when Delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<TaskForm {...baseProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalled();
  });
});
