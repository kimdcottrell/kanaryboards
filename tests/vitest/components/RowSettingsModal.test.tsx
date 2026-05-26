import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, test, expect, describe, beforeEach, afterEach } from "vitest";

vi.mock("@components/context/useBoard.ts", () => ({
  useBoard: vi.fn(),
}));

import { useBoard } from "@components/context/useBoard.ts";
import RowSettingsModal from "@components/RowSettingsModal.jsx";

const mockUseBoard = vi.mocked(useBoard);

const mockRow = { id: "row-1", name: "Feature", color: "#ff6b6b" };

function makeBoard(overrides = {}) {
  return {
    renameRow: vi.fn(),
    deleteRow: vi.fn(),
    generateTasksForRow: vi.fn(),
    isGeneratingTasks: false,
    taskGenerationStatus: "",
    taskGenerationIsError: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseBoard.mockReturnValue(makeBoard() as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RowSettingsModal – task generation", () => {
  test("shows alert-info with status text while generating", () => {
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: true,
      taskGenerationStatus: "Generating tasks...",
    }) as any);
    const { container } = render(
      <RowSettingsModal row={mockRow} open={true} onClose={vi.fn()} />,
    );
    const alert = container.querySelector(".alert-info");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Generating tasks...");
  });

  test("hides Generate Tasks button while generating", () => {
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: true,
      taskGenerationStatus: "Generating tasks...",
    }) as any);
    render(<RowSettingsModal row={mockRow} open={true} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Generate Tasks", hidden: true })).toBeNull();
  });

  test("shows Generate Tasks button when not generating", () => {
    render(<RowSettingsModal row={mockRow} open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Generate Tasks", hidden: true })).toBeTruthy();
  });

  test("shows alert-error with wifi-error icon and message on API failure", () => {
    const errorMessage =
      "Unable to generate tasks. Error: This model models/gemini-3.1-flash-lite-preview is no longer available. Please update your code to use a newer model for the latest features and improvements.";
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: false,
      taskGenerationStatus: errorMessage,
      taskGenerationIsError: true,
    }) as any);
    const { container } = render(
      <RowSettingsModal row={mockRow} open={true} onClose={vi.fn()} />,
    );
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
    const { container } = render(
      <RowSettingsModal row={mockRow} open={true} onClose={vi.fn()} />,
    );
    expect(container.querySelector(".alert-error")).toBeNull();
  });

  test("shows alert-success with add-to-list icon and message on successful generation", () => {
    mockUseBoard.mockReturnValue(makeBoard({
      isGeneratingTasks: false,
      taskGenerationStatus: "Added 5 tasks to Todo",
      taskGenerationIsError: false,
    }) as any);
    const { container } = render(
      <RowSettingsModal row={mockRow} open={true} onClose={vi.fn()} />,
    );
    const alert = container.querySelector(".alert-success");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Added 5 tasks to Todo");
    expect(container.querySelector(".hugeicons--add-to-list")).toBeTruthy();
  });

  test("shows no status alert when taskGenerationStatus is empty", () => {
    const { container } = render(
      <RowSettingsModal row={mockRow} open={true} onClose={vi.fn()} />,
    );
    expect(container.querySelector(".alert-error")).toBeNull();
    expect(container.querySelector(".alert-success")).toBeNull();
  });
});
