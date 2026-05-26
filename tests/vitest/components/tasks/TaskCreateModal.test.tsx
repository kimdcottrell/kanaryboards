import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, test, expect, describe, beforeEach, afterEach } from "vitest";
import {
  makeBaseBoardState,
  mockTaskDraft,
} from "./setup.ts";

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
import TaskCreateModal from "@components/TaskCreateModal.jsx";

const mockUseBoard = vi.mocked(useBoard);
const board = makeBaseBoardState();

beforeEach(() => {
  mockUseBoard.mockReturnValue(board as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TaskCreateModal", () => {
  test("modal dialog has modal-open class when open", () => {
    mockUseBoard.mockReturnValue({ ...board, taskCreateModalOpen: true } as any);
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
    mockUseBoard.mockReturnValue({
      ...board,
      taskCreateModalOpen: true,
      taskDraft: mockTaskDraft,
    } as any);
    render(<TaskCreateModal />);
    expect(
      screen.getByRole("button", { name: "Create task", hidden: true }),
    ).toBeTruthy();
  });

  test("Cancel button is present in create modal", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskCreateModalOpen: true,
      taskDraft: mockTaskDraft,
    } as any);
    render(<TaskCreateModal />);
    expect(
      screen.getByRole("button", { name: "Cancel", hidden: true }),
    ).toBeTruthy();
  });

  test("Luthor editor defaults to markdown mode", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskCreateModalOpen: true,
      taskDraft: mockTaskDraft,
    } as any);
    render(<TaskCreateModal />);
    expect(
      screen.getByTestId("luthor-editor").getAttribute("data-initial-mode"),
    ).toBe("markdown");
  });

  test("Delete button is absent in create modal", () => {
    mockUseBoard.mockReturnValue({
      ...board,
      taskCreateModalOpen: true,
      taskDraft: mockTaskDraft,
    } as any);
    render(<TaskCreateModal />);
    expect(
      screen.queryByRole("button", { name: "Delete", hidden: true }),
    ).toBeNull();
  });
});
