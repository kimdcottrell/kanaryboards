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

// Comments have their own tests (TaskComments.test.tsx).
vi.mock("@components/task/comments/TaskComments.tsx", () => ({
  default: () => null,
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
import TaskEditModal from "@components/task/modal/TaskEditModal.tsx";

const editTask: Task = {
  id: "task-42",
  rowId: "row-1",
  colId: "col-1",
  order: "a0",
  title: "Existing task",
  description: "",
  checklist: [],
  trashedAt: null,
  preTrashColId: null,
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
  test("renders the title input in place of a heading, without a visible label", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    render(<TaskEditModal />);
    expect(screen.queryByText("Edit task")).toBeNull();
    expect(screen.queryByText("Title")).toBeNull();
    const title = screen.getByDisplayValue("Existing task");
    expect(title.getAttribute("aria-label")).toBe("Title");
    expect(title.closest("form")).toBeNull();
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

  test("Trash button is present in edit modal", () => {
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    render(<TaskEditModal />);
    expect(
      screen.getByRole("button", { name: "Trash", hidden: true }),
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

  test("Status steps show all column options", () => {
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
      screen.getByRole("radio", { name: "To Do", hidden: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "In Progress", hidden: true }),
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
      screen.getByRole("radio", { name: "Feature", hidden: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Backend", hidden: true }),
    ).toBeTruthy();
  });

  test("Status steps reflect the task's current colId", () => {
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
    expect(
      screen.getByRole("radio", { name: "In Progress", hidden: true }),
    ).toHaveProperty("checked", true);
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
    const { container } = render(<TaskEditModal />);
    expect(
      container.querySelector<HTMLInputElement>(
        "input[name='row-select-task-42']:checked",
      )?.value,
    ).toBe("row-2");
  });

  test("calls trashTask with the task id when Trash is clicked", () => {
    const trashTask = vi.fn();
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    vi.mocked(useTaskActions).mockReturnValue(makeTaskActions({ trashTask }));
    render(<TaskEditModal />);
    fireEvent.click(
      screen.getByRole("button", { name: "Trash", hidden: true }),
    );
    expect(trashTask).toHaveBeenCalledWith("task-42");
  });

  test("stays closed and renders no form for a trashed task (TaskViewOnlyModal opens instead)", () => {
    const trashColumn = {
      ...mockColumn,
      id: "col-trash",
      title: "Trash",
      isTrash: true,
    };
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({
        taskEditModalOpen: true,
        editTaskDraft: { ...editTask, colId: "col-trash" },
      }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({
        columns: [mockColumn, trashColumn],
        rows: [mockRow],
      }),
    );
    const { container } = render(<TaskEditModal />);
    expect(container.querySelector("dialog")?.className).not.toContain(
      "modal-open",
    );
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByText(/Loading task/)).toBeNull();
  });

  test("Save calls saveTaskEdit and navigates to /dashboard", () => {
    const saveTaskEdit = vi.fn();
    vi.mocked(useTaskEditState).mockReturnValue(
      makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
    );
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ columns: [mockColumn], rows: [mockRow] }),
    );
    vi.mocked(useTaskEditActions).mockReturnValue(
      makeTaskEditActions({ saveTaskEdit }),
    );
    render(<TaskEditModal />);
    fireEvent.click(screen.getByRole("button", { name: "Save", hidden: true }));
    expect(saveTaskEdit).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
