import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, test, expect, describe, beforeEach, afterEach } from "vitest";

vi.mock("@components/context/useBoard.ts", () => ({
  useBoard: vi.fn(),
}));

import { useBoard } from "@components/context/useBoard.ts";
import BoardConfiguration from "@components/BoardConfiguration.jsx";

const mockUseBoard = vi.mocked(useBoard);

function makeBoard(overrides = {}) {
  return {
    rows: [],
    defaultColumnNames: ["Todo", "In Progress", "Done"],
    newRowName: "",
    newRowPrompt: "",
    newRowFormKey: 0,
    isGeneratingTasks: false,
    taskGenerationStatus: "",
    taskGenerationIsError: false,
    defaultColumnInput: "",
    draggedDefaultIndex: null,
    setNewRowName: vi.fn(),
    setNewRowPrompt: vi.fn(),
    setDefaultColumnInput: vi.fn(),
    setDraggedDefaultIndex: vi.fn(),
    addRow: vi.fn(),
    handleDefaultColumnInputKeyDown: vi.fn(),
    handleDefaultColumnDragStart: vi.fn(() => vi.fn()),
    handleDefaultColumnDragOver: vi.fn(),
    handleDefaultColumnDrop: vi.fn(() => vi.fn()),
    removeDefaultColumn: vi.fn(),
    updateRowColor: vi.fn(),
    moveRowUp: vi.fn(),
    moveRowDown: vi.fn(),
    renameRow: vi.fn(),
    confirmResetBoard: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseBoard.mockReturnValue(makeBoard() as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("BoardConfiguration – task generation", () => {
  test("shows alert-info with status text while generating", () => {
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: true,
      taskGenerationStatus: "Generating tasks...",
    }) as any);
    const { container } = render(<BoardConfiguration />);
    const alert = container.querySelector(".alert-info");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Generating tasks...");
  });

  test("hides Add Row button while generating", () => {
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: true,
      taskGenerationStatus: "Generating tasks...",
    }) as any);
    render(<BoardConfiguration />);
    expect(screen.queryByRole("button", { name: "Add Row" })).toBeNull();
  });

  test("shows Add Row button when not generating", () => {
    render(<BoardConfiguration />);
    expect(screen.getByRole("button", { name: "Add Row" })).toBeTruthy();
  });

  test("shows alert-error with wifi-error icon and message on API failure", () => {
    const errorMessage =
      "Unable to generate tasks. Error: This model models/gemini-3.1-flash-lite-preview is no longer available. Please update your code to use a newer model for the latest features and improvements.";
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: false,
      taskGenerationStatus: errorMessage,
      taskGenerationIsError: true,
    }) as any);
    const { container } = render(<BoardConfiguration />);
    const alert = container.querySelector(".alert-error");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain(errorMessage);
    expect(container.querySelector(".hugeicons--wifi-error-01")).toBeTruthy();
  });

  test("alert-error does not appear during generation even when previous error exists", () => {
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: true,
      taskGenerationStatus: "Generating tasks...",
      taskGenerationIsError: true,
    }) as any);
    const { container } = render(<BoardConfiguration />);
    expect(container.querySelector(".alert-error")).toBeNull();
  });

  test("shows alert-success with add-to-list icon and message on successful generation", () => {
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: false,
      taskGenerationStatus: "Added 3 tasks to Todo",
      taskGenerationIsError: false,
    }) as any);
    const { container } = render(<BoardConfiguration />);
    const alert = container.querySelector(".alert-success");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Added 3 tasks to Todo");
    expect(container.querySelector(".hugeicons--add-to-list")).toBeTruthy();
  });

  test("shows no status alert when taskGenerationStatus is empty", () => {
    const { container } = render(<BoardConfiguration />);
    expect(container.querySelector(".alert-error")).toBeNull();
    expect(container.querySelector(".alert-success")).toBeNull();
  });
});
