import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect, describe, beforeEach, afterEach } from "vitest";
import { makeBaseBoardState, mockRow, mockTask } from "./setup.ts";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) };
});

vi.mock("@components/context/useBoard.ts", () => ({
  useBoard: vi.fn(),
}));

import { useBoard } from "@components/context/useBoard.ts";
import TaskCard from "@components/TaskCard.jsx";

const mockUseBoard = vi.mocked(useBoard);
const board = makeBaseBoardState();

beforeEach(() => {
  mockUseBoard.mockReturnValue(board as any);
});

afterEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockClear();
});

const defaultProps = {
  task: mockTask,
  row: mockRow,
  onDragOver: vi.fn(),
  isDropBefore: false,
  isDropAfter: false,
  isDragging: false,
};

describe("TaskCard", () => {
  test("renders the task title", () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText("Test task")).toBeTruthy();
  });

  test("does not render checklist section when task has no checklist items", () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.queryByText("Checklist")).toBeNull();
  });

  test("renders checklist label and all items when present", () => {
    const task = {
      ...mockTask,
      checklist: [
        { id: "i1", text: "Step one", checked: false },
        { id: "i2", text: "Step two", checked: true },
      ],
    };
    render(<TaskCard {...defaultProps} task={task} />);
    expect(screen.getByText("Checklist")).toBeTruthy();
    expect(screen.getByText("Step one")).toBeTruthy();
    expect(screen.getByText("Step two")).toBeTruthy();
  });

  test("applies line-through class to checked items and not to unchecked", () => {
    const task = {
      ...mockTask,
      checklist: [
        { id: "i1", text: "Done item", checked: true },
        { id: "i2", text: "Pending item", checked: false },
      ],
    };
    const { container } = render(<TaskCard {...defaultProps} task={task} />);
    const spans = container.querySelectorAll("span");
    const done = Array.from(spans).find((s) => s.textContent === "Done item");
    const pending = Array.from(spans).find(
      (s) => s.textContent === "Pending item",
    );
    expect(done?.className).toContain("line-through");
    expect(pending?.className).not.toContain("line-through");
  });

  test("task article element is draggable", () => {
    const { container } = render(<TaskCard {...defaultProps} />);
    expect(
      container.querySelector("article")?.getAttribute("draggable"),
    ).toBe("true");
  });

  test("reduces opacity to 0.4 when isDragging is true", () => {
    const { container } = render(
      <TaskCard {...defaultProps} isDragging={true} />,
    );
    expect(container.querySelector("article")?.style.opacity).toBe("0.4");
  });

  test("keeps full opacity when isDragging is false", () => {
    const { container } = render(
      <TaskCard {...defaultProps} isDragging={false} />,
    );
    expect(container.querySelector("article")?.style.opacity).toBe("1");
  });

  test("calls startEditTask with the task when the title area is clicked", () => {
    render(<TaskCard {...defaultProps} />);
    fireEvent.click(screen.getByText("Test task"));
    expect(board.startEditTask).toHaveBeenCalledWith(mockTask);
  });

  test("calls toggleTaskChecklist with task and item ids when checkbox changes", () => {
    const task = {
      ...mockTask,
      checklist: [{ id: "i1", text: "A step", checked: false }],
    };
    render(<TaskCard {...defaultProps} task={task} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(board.toggleTaskChecklist).toHaveBeenCalledWith("task-1", "i1");
  });
});
