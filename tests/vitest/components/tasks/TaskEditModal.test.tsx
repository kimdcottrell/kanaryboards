import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect, describe, beforeEach, afterEach } from "vitest";
import {
  makeBaseBoardState,
  mockColumn,
  mockRow,
  secondColumn,
  secondRow,
} from "./setup.ts";
import type { Task } from "@components/context/types.ts";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) };
});

vi.mock("@components/context/useBoard.ts", () => ({
  useBoard: vi.fn(),
}));

vi.mock("@lyfie/luthor", () => ({
  ExtensiveEditor: (props: any) =>
    React.createElement("div", {
      "data-testid": "luthor-editor",
      "data-initial-mode": props.initialMode,
    }),
}));

import { useBoard } from "@components/context/useBoard.ts";
import TaskEditModal from "@components/TaskEditModal.jsx";

const mockUseBoard = vi.mocked(useBoard);
const board = makeBaseBoardState();

const editTask: Task = {
  id: "task-42",
  rowId: "row-1",
  colId: "col-1",
  title: "Existing task",
  description: "",
  checklist: [],
};

beforeEach(() => {
  mockUseBoard.mockReturnValue(board as any);
});

afterEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockClear();
});

describe("TaskEditModal", () => {
  test("shows 'Edit task' heading", () => {
    render(<TaskEditModal />);
    expect(screen.getByText("Edit task")).toBeTruthy();
  });

  test("shows loading message when editTaskDraft is null", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: null,
    } as any);
    render(<TaskEditModal />);
    expect(screen.getByText(/Loading task/)).toBeTruthy();
  });

  test("does not show loading message when editTaskDraft is set", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: editTask,
      columns: [mockColumn],
      rows: [mockRow],
    } as any);
    render(<TaskEditModal />);
    expect(screen.queryByText(/Loading task/)).toBeNull();
  });

  test("submit button label is 'Save' in edit mode", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: editTask,
      columns: [mockColumn],
      rows: [mockRow],
    } as any);
    render(<TaskEditModal />);
    expect(
      screen.getByRole("button", { name: "Save", hidden: true }),
    ).toBeTruthy();
  });

  test("Delete button is present in edit modal", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: editTask,
      columns: [mockColumn],
      rows: [mockRow],
    } as any);
    render(<TaskEditModal />);
    expect(
      screen.getByRole("button", { name: "Delete", hidden: true }),
    ).toBeTruthy();
  });

  test("Cancel button is absent in edit modal (TaskForm receives no onCancel)", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: editTask,
      columns: [mockColumn],
      rows: [mockRow],
    } as any);
    render(<TaskEditModal />);
    expect(
      screen.queryByRole("button", { name: "Cancel", hidden: true }),
    ).toBeNull();
  });

  test("Luthor editor defaults to visual-only mode", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: editTask,
      columns: [mockColumn],
      rows: [mockRow],
    } as any);
    render(<TaskEditModal />);
    expect(
      screen.getByTestId("luthor-editor").getAttribute("data-initial-mode"),
    ).toBe("visual-only");
  });

  test("Status dropdown shows all column options", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: editTask,
      columns: [mockColumn, secondColumn],
      rows: [mockRow],
    } as any);
    render(<TaskEditModal />);
    expect(
      screen.getByRole("option", { name: "To Do", hidden: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "In Progress", hidden: true }),
    ).toBeTruthy();
  });

  test("Row dropdown shows all row options", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: editTask,
      columns: [mockColumn],
      rows: [mockRow, secondRow],
    } as any);
    render(<TaskEditModal />);
    expect(
      screen.getByRole("option", { name: "Feature", hidden: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Backend", hidden: true }),
    ).toBeTruthy();
  });

  test("Status dropdown reflects the task's current colId", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: { ...editTask, colId: "col-2" },
      columns: [mockColumn, secondColumn],
      rows: [mockRow],
    } as any);
    render(<TaskEditModal />);
    const [statusSelect] = screen.getAllByRole("combobox", {
      hidden: true,
    }) as HTMLSelectElement[];
    expect(statusSelect.value).toBe("col-2");
  });

  test("Row dropdown reflects the task's current rowId", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: { ...editTask, rowId: "row-2" },
      columns: [mockColumn],
      rows: [mockRow, secondRow],
    } as any);
    render(<TaskEditModal />);
    const selects = screen.getAllByRole("combobox", {
      hidden: true,
    }) as HTMLSelectElement[];
    expect(selects[1].value).toBe("row-2");
  });

  test("calls deleteTask with the task id when Delete is clicked", () => {
    const deleteTask = vi.fn();
    mockUseBoard.mockReturnValue({
      ...board,
      taskEditModalOpen: true,
      editTaskDraft: editTask,
      columns: [mockColumn],
      rows: [mockRow],
      deleteTask,
    } as any);
    render(<TaskEditModal />);
    fireEvent.click(
      screen.getByRole("button", { name: "Delete", hidden: true }),
    );
    expect(deleteTask).toHaveBeenCalledWith("task-42");
  });
});
