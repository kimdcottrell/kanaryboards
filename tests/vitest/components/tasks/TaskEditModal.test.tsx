import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect, describe, beforeEach, afterEach } from "vitest";
import {
  makeBoardDataState,
  makeBoardRefs,
  makeChecklistAIActions,
  makeChecklistAIState,
  makeTaskActions,
  makeTaskEditActions,
  makeTaskEditState,
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

vi.mock("@components/context/hooks.ts", () => ({
  useBoardDataState: vi.fn(),
  useTaskEditState: vi.fn(),
  useTaskEditActions: vi.fn(),
  useTaskActions: vi.fn(),
  useBoardRefs: vi.fn(),
  useChecklistAIState: vi.fn(),
  useChecklistAIActions: vi.fn(),
  handleChecklistKeyDown: vi.fn(),
}));

vi.mock("@lyfie/luthor", () => ({
  ExtensiveEditor: (props: any) =>
    React.createElement("div", {
      "data-testid": "luthor-editor",
      "data-initial-mode": props.initialMode,
    }),
}));

import {
  useBoardDataState,
  useBoardRefs,
  useChecklistAIActions,
  useChecklistAIState,
  useTaskActions,
  useTaskEditActions,
  useTaskEditState,
} from "@components/context/hooks.ts";
import TaskEditModal from "@components/TaskEditModal.tsx";

const editTask: Task = {
  id: "task-42",
  rowId: "row-1",
  colId: "col-1",
  title: "Existing task",
  description: "",
  checklist: [],
};

beforeEach(() => {
  vi.mocked(useBoardDataState).mockReturnValue(makeBoardDataState() as any);
  vi.mocked(useTaskEditState).mockReturnValue(makeTaskEditState() as any);
  vi.mocked(useTaskEditActions).mockReturnValue(makeTaskEditActions() as any);
  vi.mocked(useTaskActions).mockReturnValue(makeTaskActions() as any);
  vi.mocked(useBoardRefs).mockReturnValue(makeBoardRefs() as any);
  vi.mocked(useChecklistAIState).mockReturnValue(makeChecklistAIState() as any);
  vi.mocked(useChecklistAIActions).mockReturnValue(makeChecklistAIActions() as any);
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
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: null }) as any,
    );
    render(<TaskEditModal />);
    expect(screen.getByText(/Loading task/)).toBeTruthy();
  });

  test("does not show loading message when editTaskDraft is set", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }) as any,
    );
    render(<TaskEditModal />);
    expect(screen.queryByText(/Loading task/)).toBeNull();
  });

  test("submit button label is 'Save' in edit mode", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }) as any,
    );
    render(<TaskEditModal />);
    expect(
      screen.getByRole("button", { name: "Save", hidden: true }),
    ).toBeTruthy();
  });

  test("Delete button is present in edit modal", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }) as any,
    );
    render(<TaskEditModal />);
    expect(
      screen.getByRole("button", { name: "Delete", hidden: true }),
    ).toBeTruthy();
  });

  test("Cancel button is absent in edit modal (TaskForm receives no onCancel)", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }) as any,
    );
    render(<TaskEditModal />);
    expect(
      screen.queryByRole("button", { name: "Cancel", hidden: true }),
    ).toBeNull();
  });

  test("Luthor editor defaults to visual-only mode", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }) as any,
    );
    render(<TaskEditModal />);
    expect(
      screen.getByTestId("luthor-editor").getAttribute("data-initial-mode"),
    ).toBe("visual-only");
  });

  test("Status dropdown shows all column options", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn, secondColumn], rows: [mockRow] }) as any,
    );
    render(<TaskEditModal />);
    expect(
      screen.getByRole("option", { name: "To Do", hidden: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "In Progress", hidden: true }),
    ).toBeTruthy();
  });

  test("Row dropdown shows all row options", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow, secondRow] }) as any,
    );
    render(<TaskEditModal />);
    expect(
      screen.getByRole("option", { name: "Feature", hidden: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Backend", hidden: true }),
    ).toBeTruthy();
  });

  test("Status dropdown reflects the task's current colId", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({
        taskEditModalOpen: true,
        editTaskDraft: { ...editTask, colId: "col-2" },
      }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn, secondColumn], rows: [mockRow] }) as any,
    );
    render(<TaskEditModal />);
    const [statusSelect] = screen.getAllByRole("combobox", {
      hidden: true,
    }) as HTMLSelectElement[];
    expect(statusSelect.value).toBe("col-2");
  });

  test("Row dropdown reflects the task's current rowId", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({
        taskEditModalOpen: true,
        editTaskDraft: { ...editTask, rowId: "row-2" },
      }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow, secondRow] }) as any,
    );
    render(<TaskEditModal />);
    const selects = screen.getAllByRole("combobox", {
      hidden: true,
    }) as HTMLSelectElement[];
    expect(selects[1].value).toBe("row-2");
  });

  test("calls deleteTask with the task id when Delete is clicked", () => {
    const deleteTask = vi.fn();
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }) as any,
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }) as any,
    );
    vi.mocked(useTaskActions).mockReturnValue(makeTaskActions({ deleteTask }) as any);
    render(<TaskEditModal />);
    fireEvent.click(
      screen.getByRole("button", { name: "Delete", hidden: true }),
    );
    expect(deleteTask).toHaveBeenCalledWith("task-42");
  });
});
