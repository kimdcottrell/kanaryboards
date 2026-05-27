import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
// Mutable object — tests set .taskId before rendering components that use useParams
const mockParams: { taskId?: string } = {};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

vi.mock("@components/context/useBoard.ts", () => ({ useBoard: vi.fn() }));

// Stub heavy child components used by BoardInner that aren't under test here
vi.mock("@components/BoardConfiguration.jsx", () => ({ default: () => null }));
vi.mock("@components/RowBoard.jsx", () => ({ default: () => null }));
vi.mock("@components/TaskCreateModal.jsx", () => ({ default: () => null }));
// TaskEditModal is NOT mocked — it is rendered directly in tests below

// Stub the rich-text editor used inside TaskForm / TaskEditModal
vi.mock("@lyfie/luthor", () => ({
  ExtensiveEditor: (props: any) =>
    React.createElement("div", { "data-testid": "luthor-editor" }),
}));

import { useBoard } from "@components/context/useBoard.ts";
import TaskCard from "@components/TaskCard.jsx";
import TaskEditModal from "@components/TaskEditModal.jsx";
import BoardInner from "@components/BoardInner.jsx";
import {
  makeBaseBoardState,
  mockRow,
  mockTask,
  mockColumn,
  secondColumn,
  secondRow,
} from "./setup.ts";

const mockUseBoard = vi.mocked(useBoard);

const urlTask = { ...mockTask, id: "task-abc-123" };

beforeEach(() => {
  mockNavigate.mockClear();
  delete mockParams.taskId;
  mockUseBoard.mockReturnValue(makeBaseBoardState() as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── TaskCard: URL gets established on click ───────────────────────────────────

describe("TaskCard — URL navigation", () => {
  const cardProps = {
    task: urlTask,
    row: mockRow,
    onDragOver: vi.fn(),
    isDropBefore: false,
    isDropAfter: false,
    isDragging: false,
  };

  test("clicking the task title navigates to /task/:id", () => {
    const { getByText } = render(<TaskCard {...cardProps} />);
    fireEvent.click(getByText(urlTask.title));
    expect(mockNavigate).toHaveBeenCalledWith(`/task/${urlTask.id}`);
  });

  test("navigate receives the exact task ID (URL is deterministic from task ID)", () => {
    const { getByText } = render(<TaskCard {...cardProps} />);
    fireEvent.click(getByText(urlTask.title));
    const [url] = mockNavigate.mock.calls[0] as [string];
    expect(url).toBe(`/task/task-abc-123`);
  });

  test("startEditTask is called alongside navigate when clicking the title", () => {
    const startEditTask = vi.fn();
    mockUseBoard.mockReturnValue({ ...makeBaseBoardState(), startEditTask } as any);
    const { getByText } = render(<TaskCard {...cardProps} />);
    fireEvent.click(getByText(urlTask.title));
    expect(startEditTask).toHaveBeenCalledWith(urlTask);
    expect(mockNavigate).toHaveBeenCalledWith(`/task/${urlTask.id}`);
  });

  test("clicking the edit (pencil) button also navigates to /task/:id", () => {
    const { container } = render(<TaskCard {...cardProps} />);
    const btn = container.querySelector("button") as HTMLButtonElement;
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith(`/task/${urlTask.id}`);
  });

  test("different tasks produce different navigate URLs", () => {
    const otherTask = { ...urlTask, id: "task-xyz-999" };
    const { getByText } = render(
      <TaskCard {...cardProps} task={otherTask} />,
    );
    fireEvent.click(getByText(otherTask.title));
    expect(mockNavigate).toHaveBeenCalledWith("/task/task-xyz-999");
  });
});

// ── TaskEditModal: URL unchanged during status / row edits ────────────────────

const editTask = {
  id: "task-abc-123",
  rowId: "row-1",
  colId: "col-1",
  title: "Existing task",
  description: "",
  checklist: [],
};

function makeEditState(overrides: object = {}) {
  return {
    ...makeBaseBoardState(),
    taskEditModalOpen: true,
    editTaskDraft: editTask,
    columns: [mockColumn, secondColumn],
    rows: [mockRow, secondRow],
    ...overrides,
  };
}

describe("TaskEditModal — URL unchanged when status changes", () => {
  test("changing Status dropdown does not call navigate", () => {
    const setEditTaskDraft = vi.fn();
    mockUseBoard.mockReturnValue({ ...makeEditState(), setEditTaskDraft } as any);
    const { getAllByRole } = render(<TaskEditModal />);
    const [statusSelect] = getAllByRole("combobox", {
      hidden: true,
    }) as HTMLSelectElement[];
    fireEvent.change(statusSelect, { target: { value: secondColumn.id } });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(setEditTaskDraft).toHaveBeenCalled();
  });

  test("Status dropdown change calls setEditTaskDraft with updated colId", () => {
    const setEditTaskDraft = vi.fn();
    mockUseBoard.mockReturnValue({ ...makeEditState(), setEditTaskDraft } as any);
    const { getAllByRole } = render(<TaskEditModal />);
    const [statusSelect] = getAllByRole("combobox", {
      hidden: true,
    }) as HTMLSelectElement[];
    fireEvent.change(statusSelect, { target: { value: "col-2" } });
    expect(setEditTaskDraft).toHaveBeenCalledWith(
      expect.objectContaining({ colId: "col-2" }),
    );
  });
});

describe("TaskEditModal — URL unchanged when row changes", () => {
  test("changing Row dropdown does not call navigate", () => {
    const setEditTaskDraft = vi.fn();
    mockUseBoard.mockReturnValue({ ...makeEditState(), setEditTaskDraft } as any);
    const { getAllByRole } = render(<TaskEditModal />);
    const selects = getAllByRole("combobox", {
      hidden: true,
    }) as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: secondRow.id } });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(setEditTaskDraft).toHaveBeenCalled();
  });

  test("Row dropdown change calls setEditTaskDraft with updated rowId", () => {
    const setEditTaskDraft = vi.fn();
    mockUseBoard.mockReturnValue({ ...makeEditState(), setEditTaskDraft } as any);
    const { getAllByRole } = render(<TaskEditModal />);
    const selects = getAllByRole("combobox", {
      hidden: true,
    }) as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: "row-2" } });
    expect(setEditTaskDraft).toHaveBeenCalledWith(
      expect.objectContaining({ rowId: "row-2" }),
    );
  });
});

describe("TaskEditModal — URL updates on save actions", () => {
  test("closing the modal calls navigate('/')", () => {
    const cancelEditTask = vi.fn();
    mockUseBoard.mockReturnValue({ ...makeEditState(), cancelEditTask } as any);
    const { container } = render(<TaskEditModal />);
    const backdrop = container.querySelector(".modal-backdrop") as HTMLElement;
    fireEvent.click(backdrop);
    expect(cancelEditTask).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("deleting the task calls navigate('/')", () => {
    const deleteTask = vi.fn();
    mockUseBoard.mockReturnValue({ ...makeEditState(), deleteTask } as any);
    const { getByRole } = render(<TaskEditModal />);
    fireEvent.click(getByRole("button", { name: "Delete", hidden: true }));
    expect(deleteTask).toHaveBeenCalledWith(editTask.id);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});

// ── BoardInner: deep-link useEffect (URL → open task) ────────────────────────

describe("BoardInner — deep-link via initialTaskId", () => {
  const deepTask = {
    id: "deep-task-id",
    rowId: "row-1",
    colId: "col-1",
    title: "Deep task",
    description: "",
    checklist: [],
  };

  test("startEditTask is called with the matching task when boardLoaded=true and task exists", () => {
    const startEditTask = vi.fn();
    mockUseBoard.mockReturnValue({
      ...makeBaseBoardState(),
      boardLoaded: true,
      tasks: [deepTask],
      startEditTask,
    } as any);
    act(() => {
      render(<BoardInner initialTaskId={deepTask.id} />);
    });
    expect(startEditTask).toHaveBeenCalledWith(deepTask);
  });

  test("navigate('/', {replace:true}) is called when taskId is not found in loaded board", () => {
    mockUseBoard.mockReturnValue({
      ...makeBaseBoardState(),
      boardLoaded: true,
      tasks: [],
      startEditTask: vi.fn(),
    } as any);
    act(() => {
      render(<BoardInner initialTaskId="ghost-task-id" />);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  test("startEditTask is NOT called before the board has loaded", () => {
    const startEditTask = vi.fn();
    mockUseBoard.mockReturnValue({
      ...makeBaseBoardState(),
      boardLoaded: false,
      tasks: [deepTask],
      startEditTask,
    } as any);
    act(() => {
      render(<BoardInner initialTaskId={deepTask.id} />);
    });
    expect(startEditTask).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("no navigation or modal is triggered when no taskId is present", () => {
    const startEditTask = vi.fn();
    mockUseBoard.mockReturnValue({
      ...makeBaseBoardState(),
      boardLoaded: true,
      tasks: [deepTask],
      startEditTask,
    } as any);
    act(() => {
      render(<BoardInner initialTaskId={undefined} />);
    });
    expect(startEditTask).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("BoardInner — deep-link via route params", () => {
  const deepTask = {
    id: "route-task-id",
    rowId: "row-1",
    colId: "col-1",
    title: "Route task",
    description: "",
    checklist: [],
  };

  test("startEditTask is called for a task ID found in useParams", () => {
    mockParams.taskId = deepTask.id;
    const startEditTask = vi.fn();
    mockUseBoard.mockReturnValue({
      ...makeBaseBoardState(),
      boardLoaded: true,
      tasks: [deepTask],
      startEditTask,
    } as any);
    act(() => {
      render(<BoardInner />);
    });
    expect(startEditTask).toHaveBeenCalledWith(deepTask);
  });

  test("navigate to / when route taskId does not match any task", () => {
    mockParams.taskId = "no-such-task";
    mockUseBoard.mockReturnValue({
      ...makeBaseBoardState(),
      boardLoaded: true,
      tasks: [],
      startEditTask: vi.fn(),
    } as any);
    act(() => {
      render(<BoardInner />);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
