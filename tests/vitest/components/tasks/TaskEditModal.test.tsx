import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
  ExtensiveEditor: (props: { initialMode?: string }) =>
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
  vi.mocked(useBoardDataState).mockReturnValue(makeBoardDataState());
  vi.mocked(useTaskEditState).mockReturnValue(makeTaskEditState());
  vi.mocked(useTaskEditActions).mockReturnValue(makeTaskEditActions());
  vi.mocked(useTaskActions).mockReturnValue(makeTaskActions());
  vi.mocked(useBoardRefs).mockReturnValue(makeBoardRefs());
  vi.mocked(useChecklistAIState).mockReturnValue(makeChecklistAIState());
  vi.mocked(useChecklistAIActions).mockReturnValue(makeChecklistAIActions());
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
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: null }),
    );
    render(<TaskEditModal />);
    expect(screen.getByText(/Loading task/)).toBeTruthy();
  });

  test("does not show loading message when editTaskDraft is set", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    render(<TaskEditModal />);
    expect(screen.queryByText(/Loading task/)).toBeNull();
  });

  test("submit button label is 'Save' in edit mode", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    render(<TaskEditModal />);
    expect(
      screen.getByRole("button", { name: "Save", hidden: true }),
    ).toBeTruthy();
  });

  test("Delete button is present in edit modal", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    render(<TaskEditModal />);
    expect(
      screen.getByRole("button", { name: "Delete", hidden: true }),
    ).toBeTruthy();
  });

  test("Cancel button is present in edit modal", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    render(<TaskEditModal />);
    expect(
      screen.getByRole("button", { name: "Cancel", hidden: true }),
    ).toBeTruthy();
  });

  test("Luthor editor defaults to visual-only mode", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    render(<TaskEditModal />);
    expect(
      screen.getByTestId("luthor-editor").getAttribute("data-initial-mode"),
    ).toBe("visual-only");
  });

  test("Status dropdown shows all column options", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({
        columns: [mockColumn, secondColumn],
        rows: [mockRow],
      }),
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
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow, secondRow] }),
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
      }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({
        columns: [mockColumn, secondColumn],
        rows: [mockRow],
      }),
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
      }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow, secondRow] }),
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
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    vi.mocked(useTaskActions).mockReturnValue(makeTaskActions({ deleteTask }));
    render(<TaskEditModal />);
    fireEvent.click(
      screen.getByRole("button", { name: "Delete", hidden: true }),
    );
    expect(deleteTask).toHaveBeenCalledWith("task-42");
  });
});
