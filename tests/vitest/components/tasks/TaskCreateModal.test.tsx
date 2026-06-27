import React from "react";
import { render, screen } from "@testing-library/react";
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

vi.mock("@components/context/hooks.ts", () => ({
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
} from "@components/context/hooks.ts";
import TaskCreateModal from "@components/TaskCreateModal.tsx";

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

  test("does not render TaskForm when closed", () => {
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

  test("renders required Status and Row selects", () => {
    vi.mocked(useTaskCreateState).mockReturnValue(
      makeTaskCreateState({
        taskCreateModalOpen: true,
        taskDraft: mockTaskDraft,
      }),
    );
    const { container } = render(<TaskCreateModal />);
    const status = container.querySelector<HTMLSelectElement>(
      "#create-column-select",
    );
    const row = container.querySelector<HTMLSelectElement>(
      "#create-row-select",
    );
    expect(status?.required).toBe(true);
    expect(row?.required).toBe(true);
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
      container.querySelector<HTMLSelectElement>("#create-column-select")
        ?.value,
    ).toBe("");
    expect(
      container.querySelector<HTMLSelectElement>("#create-row-select")?.value,
    ).toBe("");
  });
});
