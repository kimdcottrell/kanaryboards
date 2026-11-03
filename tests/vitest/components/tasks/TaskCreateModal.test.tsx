import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  makeBoardDataState,
  makeBoardRefs,
  makeChecklistAIActions,
  makeChecklistAIState,
  makeTaskActions,
  makeTaskCreateActions,
  makeTaskCreateState,
  mockTaskDraft,
} from "./setup.ts";

vi.mock("@components/react/context/hooks.ts", () => ({
  useBoardDataState: vi.fn(),
  useTaskCreateState: vi.fn(),
  useTaskCreateActions: vi.fn(),
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
  useTaskCreateActions,
  useTaskCreateState,
} from "@components/react/context/hooks.ts";
import TaskCreateModal from "@components/react/task/modal/TaskCreateModal.tsx";

beforeEach(() => {
  vi.mocked(useBoardDataState).mockReturnValue(makeBoardDataState());
  vi.mocked(useTaskCreateState).mockReturnValue(makeTaskCreateState());
  vi.mocked(useTaskCreateActions).mockReturnValue(makeTaskCreateActions());
  vi.mocked(useTaskActions).mockReturnValue(makeTaskActions());
  vi.mocked(useBoardRefs).mockReturnValue(makeBoardRefs());
  vi.mocked(useChecklistAIState).mockReturnValue(makeChecklistAIState());
  vi.mocked(useChecklistAIActions).mockReturnValue(makeChecklistAIActions());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TaskCreateModal", () => {
  test("modal dialog has modal-open class when open", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({ taskCreateModalOpen: true }),
    );
    const { container } = render(<TaskCreateModal />);
    expect(container.querySelector("dialog")?.className).toContain(
      "modal-open",
    );
  });

  test("modal dialog lacks modal-open class when closed", () => {
    const { container } = render(<TaskCreateModal />);
    expect(container.querySelector("dialog")?.className).not.toContain(
      "modal-open",
    );
  });

  test("shows 'Add task' heading", () => {
    render(<TaskCreateModal />);
    expect(screen.getByText("Add task")).toBeTruthy();
  });

  test("shows descriptive subtitle text", () => {
    render(<TaskCreateModal />);
    expect(screen.getByText(/Create a new task/)).toBeTruthy();
  });

  test("does not render the form when closed", () => {
    render(<TaskCreateModal />);
    expect(screen.queryByTestId("luthor-editor")).toBeNull();
  });

  test("submit button label is 'Create task'", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    render(<TaskCreateModal />);
    expect(
      screen.getByRole("button", { name: "Create task", hidden: true }),
    ).toBeTruthy();
  });

  test("Cancel button is present in create modal", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    render(<TaskCreateModal />);
    expect(
      screen.getByRole("button", { name: "Cancel", hidden: true }),
    ).toBeTruthy();
  });

  test("Luthor editor defaults to markdown mode", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    render(<TaskCreateModal />);
    expect(
      screen.getByTestId("luthor-editor").getAttribute("data-initial-mode"),
    ).toBe("markdown");
  });

  test("Delete button is absent in create modal", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    render(<TaskCreateModal />);
    expect(
      screen.queryByRole("button", { name: "Delete", hidden: true }),
    ).toBeNull();
  });

  test("Row and Status selects leave validation to the save", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    const { container } = render(<TaskCreateModal />);
    const radios = container.querySelectorAll<HTMLInputElement>(
      "input[name='column-select-new'], input[name='row-select-new']",
    );
    expect(radios.length).toBeGreaterThan(0);
    radios.forEach((radio) => expect(radio.required).toBe(false));
  });

  test("Status and Row selects are empty when opened with a blank draft", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: { ...mockTaskDraft, rowId: "", colId: "" },
      }),
    );
    const { container } = render(<TaskCreateModal />);
    expect(
      container.querySelector("input[name='column-select-new']:checked"),
    ).toBeNull();
    expect(
      container.querySelector("input[name='row-select-new']:checked"),
    ).toBeNull();
  });

  test("title field is labeled and has no native required check", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    render(<TaskCreateModal />);
    expect(
      screen.getByLabelText<HTMLInputElement>("Title").required,
    ).toBe(false);
  });

  // createTask resolves to /api/v1/validate's error; each field shows its own.
  const submitWithError = (error: { field?: string; error: string }) => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    vi.mocked(useTaskCreateActions).mockReturnValue(
      makeTaskCreateActions({
        createTask: vi.fn(() => Promise.resolve(error)),
      }),
    );
    render(<TaskCreateModal />);
    fireEvent.click(
      screen.getByRole("button", { name: "Create task", hidden: true }),
    );
  };

  test("a title validation error shows under the title", async () => {
    submitWithError({ field: "title", error: "Title is required." });
    expect(await screen.findByText("Title is required.")).toBeTruthy();
    expect(
      screen.getByLabelText<HTMLInputElement>("Title").getAttribute(
        "aria-invalid",
      ),
    ).toBe("true");
  });

  test("a project validation error shows under Project", async () => {
    submitWithError({ field: "rowId", error: "Project is required." });
    expect(await screen.findByText("Project is required.")).toBeTruthy();
  });

  test("an unreachable check shows a form-level error", async () => {
    submitWithError({ error: "Couldn't check this — try again." });
    expect(await screen.findByText("Couldn't check this — try again."))
      .toBeTruthy();
  });

  test("renders the checklist and AI checklist generation", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    render(<TaskCreateModal />);
    expect(screen.getByText("Checklist items")).toBeTruthy();
    expect(screen.getByText("Generate checklist items with AI")).toBeTruthy();
  });

  test("Enter in the checklist entry row adds and focuses a new item", () => {
    const addChecklistItem = vi.fn();
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: {
          ...mockTaskDraft,
          checklist: [{
            id: "c1",
            text: "Buy milk",
            checked: false,
            order: "a",
          }],
        },
      }),
    );
    vi.mocked(useTaskCreateActions).mockReturnValue(
      makeTaskCreateActions({ addChecklistItem }),
    );
    render(<TaskCreateModal />);
    fireEvent.keyDown(screen.getByDisplayValue("Buy milk"), { key: "Enter" });
    expect(addChecklistItem).toHaveBeenCalledWith(true, 0);
  });

  test("Create task submits the form to createTask", () => {
    const createTask = vi.fn(() => Promise.resolve(null));
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    vi.mocked(useTaskCreateActions).mockReturnValue(
      makeTaskCreateActions({ createTask }),
    );
    render(<TaskCreateModal />);
    fireEvent.click(
      screen.getByRole("button", { name: "Create task", hidden: true }),
    );
    // The mocked editor never calls onReady, so no description is passed and
    // createTask keeps the draft's description.
    expect(createTask).toHaveBeenCalledWith(expect.any(Event), undefined);
  });
});
