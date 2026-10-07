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
  ExtensiveEditor: (props: { availableModes?: string[] }) =>
    React.createElement("div", {
      "data-testid": "luthor-editor",
      "data-available-modes": props.availableModes?.join(","),
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
import TaskViewOnlyModal from "@components/task/modal/TaskViewOnlyModal.tsx";

const doneColumn = { ...mockColumn, id: "col-2", title: "Done" };
const trashColumn = {
  ...mockColumn,
  id: "col-trash",
  title: "Trash",
  isTrash: true,
};

const trashedTask: Task = {
  id: "task-42",
  rowId: "row-1",
  colId: "col-trash",
  order: "a0",
  title: "Trashed task",
  description: "",
  checklist: [],
  trashedAt: new Date().toISOString(),
  preTrashColId: mockColumn.id,
};

function renderWith(draft: Task | null = trashedTask) {
  vi.mocked(useTaskEditState).mockReturnValue(
    makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: draft }),
  );
  return render(<TaskViewOnlyModal />);
}

beforeEach(() => {
  vi.mocked(useBoardDataState).mockReturnValue(
    makeBoardDataState({
      columns: [mockColumn, doneColumn, trashColumn],
      rows: [mockRow],
    }),
  );
  vi.mocked(useTaskEditActions).mockReturnValue(makeTaskEditActions());
  vi.mocked(useTaskActions).mockReturnValue(makeTaskActions());
  vi.mocked(useBoardRefs).mockReturnValue(makeBoardRefs());
  vi.mocked(useChecklistAIState).mockReturnValue(makeChecklistAIState());
  vi.mocked(useChecklistAIActions).mockReturnValue(makeChecklistAIActions());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TaskViewOnlyModal", () => {
  test("opens for a trashed task", () => {
    const { container } = renderWith();
    expect(container.querySelector("dialog")?.className).toContain(
      "modal-open",
    );
  });

  test("stays closed for a task that is not trashed", () => {
    const { container } = renderWith({ ...trashedTask, colId: mockColumn.id });
    expect(container.querySelector("dialog")?.className).not.toContain(
      "modal-open",
    );
    expect(screen.queryByDisplayValue("Trashed task")).toBeNull();
  });

  test("shows the view-only alert", () => {
    renderWith();
    expect(screen.getByRole("alert", { hidden: true }).textContent).toBe(
      "Task is view-only. Restore it to edit.",
    );
  });

  test("dock is Delete forever / Cancel / Restore, without Trash or Save", () => {
    renderWith();
    expect(
      screen.queryByRole("button", { name: "Trash", hidden: true }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Save", hidden: true }),
    ).toBeNull();
    for (const name of ["Delete forever", "Cancel", "Restore"]) {
      expect(screen.getByRole("button", { name, hidden: true })).toBeTruthy();
    }
  });

  test("Restore calls restoreTask and navigates to /dashboard", () => {
    const restoreTask = vi.fn();
    vi.mocked(useTaskActions).mockReturnValue(makeTaskActions({ restoreTask }));
    renderWith();
    fireEvent.click(
      screen.getByRole("button", { name: "Restore", hidden: true }),
    );
    expect(restoreTask).toHaveBeenCalledWith("task-42");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("Delete forever calls deleteTask and navigates to /dashboard", () => {
    const deleteTask = vi.fn();
    vi.mocked(useTaskActions).mockReturnValue(makeTaskActions({ deleteTask }));
    renderWith();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete forever", hidden: true }),
    );
    expect(deleteTask).toHaveBeenCalledWith("task-42");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("Status selects the pre-trash column and doesn't offer Trash", () => {
    renderWith();
    expect(
      screen.getByRole("radio", { name: "To Do", hidden: true }),
    ).toHaveProperty("checked", true);
    expect(screen.queryByTestId("status-step-col-trash")).toBeNull();
  });

  test("editor offers only the visual-only mode", () => {
    renderWith();
    expect(
      screen.getByTestId("luthor-editor").getAttribute("data-available-modes"),
    ).toBe("visual-only");
  });

  test("has no AI checklist generation", () => {
    renderWith();
    expect(screen.queryByText("Generate checklist items with AI")).toBeNull();
  });

  test("blocks edits to Status, Project and title", () => {
    const setEditTaskDraft = vi.fn();
    vi.mocked(useTaskEditActions).mockReturnValue(
      makeTaskEditActions({ setEditTaskDraft }),
    );
    renderWith();
    fireEvent.click(screen.getByTestId("status-step-col-2"));
    fireEvent.click(screen.getByText(mockRow.title));
    const title = screen.getByDisplayValue<HTMLInputElement>("Trashed task");
    expect(title.readOnly).toBe(true);
    fireEvent.keyDown(title, { key: "a" });
    expect(setEditTaskDraft).not.toHaveBeenCalled();
    expect(
      screen.getByRole("radio", { name: "Done", hidden: true }),
    ).toHaveProperty("checked", false);
  });
});
