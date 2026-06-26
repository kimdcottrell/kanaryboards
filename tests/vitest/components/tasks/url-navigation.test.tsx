import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

vi.mock("@components/context/hooks.ts", () => ({
  useTaskActions: vi.fn(),
  useBoardDataState: vi.fn(),
  useBoardConfigActions: vi.fn(),
  useTaskEditState: vi.fn(),
  useTaskEditActions: vi.fn(),
  useBoardRefs: vi.fn(),
  useChecklistAIState: vi.fn(),
  useChecklistAIActions: vi.fn(),
  handleChecklistKeyDown: vi.fn(),
}));

// Stub heavy child components used by BoardView that aren't under test here
vi.mock("@components/BoardConfigModal.tsx", () => ({ default: () => null }));
vi.mock("@components/RowBoard.tsx", () => ({ default: () => null }));
vi.mock("@components/TaskCreateModal.tsx", () => ({ default: () => null }));
// TaskEditModal is NOT mocked — it is rendered directly in tests below

// Stub the rich-text editor used inside TaskForm / TaskEditModal
vi.mock("@lyfie/luthor", () => ({
  ExtensiveEditor: () =>
    React.createElement("div", { "data-testid": "luthor-editor" }),
}));

import {
  useBoardConfigActions,
  useBoardDataState,
  useBoardRefs,
  useChecklistAIActions,
  useChecklistAIState,
  useTaskActions,
  useTaskEditActions,
  useTaskEditState,
} from "@components/context/hooks.ts";
import TaskCard from "@components/TaskCard.tsx";
import TaskEditModal from "@components/TaskEditModal.tsx";
import BoardView from "@components/BoardView.tsx";
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
  mockTask,
  secondColumn,
  secondRow,
} from "./setup.ts";

const urlTask = { ...mockTask, id: "task-abc-123" };

beforeEach(() => {
  mockNavigate.mockClear();
  delete mockParams.taskId;
  vi.mocked(useTaskActions).mockReturnValue(makeTaskActions());
  vi.mocked(useBoardDataState).mockReturnValue(makeBoardDataState());
  vi.mocked(useBoardConfigActions).mockReturnValue({
    openBoardConfigModal: vi.fn(),
    closeBoardConfigModal: vi.fn(),
  });
  vi.mocked(useTaskEditState).mockReturnValue(makeTaskEditState());
  vi.mocked(useTaskEditActions).mockReturnValue(makeTaskEditActions());
  vi.mocked(useBoardRefs).mockReturnValue(makeBoardRefs());
  vi.mocked(useChecklistAIState).mockReturnValue(makeChecklistAIState());
  vi.mocked(useChecklistAIActions).mockReturnValue(makeChecklistAIActions());
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

  test("clicking the task title navigates to /dashboard/task/:id", () => {
    const { getByText } = render(<TaskCard {...cardProps} />);
    fireEvent.click(getByText(urlTask.title));
    expect(mockNavigate).toHaveBeenCalledWith(`/dashboard/task/${urlTask.id}`);
  });

  test("navigate receives the exact task ID (URL is deterministic from task ID)", () => {
    const { getByText } = render(<TaskCard {...cardProps} />);
    fireEvent.click(getByText(urlTask.title));
    const [url] = mockNavigate.mock.calls[0] as [string];
    expect(url).toBe(`/dashboard/task/task-abc-123`);
  });

  test("startEditTask is called alongside navigate when clicking the title", () => {
    const startEditTask = vi.fn();
    vi.mocked(useTaskActions).mockReturnValue(
      makeTaskActions({ startEditTask }),
    );
    const { getByText } = render(<TaskCard {...cardProps} />);
    fireEvent.click(getByText(urlTask.title));
    expect(startEditTask).toHaveBeenCalledWith(urlTask);
    expect(mockNavigate).toHaveBeenCalledWith(`/dashboard/task/${urlTask.id}`);
  });

  test("clicking the edit (pencil) icon also navigates to /dashboard/task/:id", () => {
    const { container } = render(<TaskCard {...cardProps} />);
    const icon = container.querySelector(
      ".hugeicons--edit-03",
    ) as HTMLElement;
    fireEvent.click(icon);
    expect(mockNavigate).toHaveBeenCalledWith(`/dashboard/task/${urlTask.id}`);
  });

  test("different tasks produce different navigate URLs", () => {
    const otherTask = { ...urlTask, id: "task-xyz-999" };
    const { getByText } = render(
      <TaskCard {...cardProps} task={otherTask} />,
    );
    fireEvent.click(getByText(otherTask.title));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/task/task-xyz-999");
  });
});

// ── TaskEditModal: URL unchanged during status / row edits ────────────────────

const editTask = {
  id: "task-abc-123",
  rowId: "row-1",
  colId: "col-1",
  title: "Existing task",
  order: "a0d",
  description: "",
  checklist: [],
};

function setEditState() {
  vi.mocked(useTaskEditState).mockReturnValue(
    makeTaskEditState({ taskEditModalOpen: true, editTaskDraft: editTask }),
  );
  vi.mocked(useBoardDataState).mockReturnValue(
    makeBoardDataState({
      columns: [mockColumn, secondColumn],
      rows: [mockRow, secondRow],
    }),
  );
}

describe("TaskEditModal — URL unchanged when status changes", () => {
  test("changing Status dropdown does not call navigate", () => {
    const setEditTaskDraft = vi.fn();
    setEditState();
    vi.mocked(useTaskEditActions).mockReturnValue(
      makeTaskEditActions({ setEditTaskDraft }),
    );
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
    setEditState();
    vi.mocked(useTaskEditActions).mockReturnValue(
      makeTaskEditActions({ setEditTaskDraft }),
    );
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
    setEditState();
    vi.mocked(useTaskEditActions).mockReturnValue(
      makeTaskEditActions({ setEditTaskDraft }),
    );
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
    setEditState();
    vi.mocked(useTaskEditActions).mockReturnValue(
      makeTaskEditActions({ setEditTaskDraft }),
    );
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
  test("closing the modal calls navigate('/dashboard')", () => {
    const cancelEditTask = vi.fn();
    setEditState();
    vi.mocked(useTaskActions).mockReturnValue(
      makeTaskActions({ cancelEditTask }),
    );
    const { container } = render(<TaskEditModal />);
    const backdrop = container.querySelector(".modal-backdrop") as HTMLElement;
    fireEvent.click(backdrop);
    expect(cancelEditTask).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("deleting the task calls navigate('/dashboard')", () => {
    const deleteTask = vi.fn();
    setEditState();
    vi.mocked(useTaskActions).mockReturnValue(makeTaskActions({ deleteTask }));
    const { getByRole } = render(<TaskEditModal />);
    fireEvent.click(getByRole("button", { name: "Delete", hidden: true }));
    expect(deleteTask).toHaveBeenCalledWith(editTask.id);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});

// ── BoardView: deep-link useEffect (URL → open task) ────────────────────────

describe("BoardView — deep-link via useParams", () => {
  const deepTask = {
    id: "deep-task-id",
    rowId: "row-1",
    colId: "col-1",
    title: "Deep task",
    order: "a0c",
    description: "",
    checklist: [],
  };

  test("startEditTask is called with the matching task when boardLoaded=true and task exists", () => {
    mockParams.taskId = deepTask.id;
    const startEditTask = vi.fn();
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ boardLoaded: true, tasks: [deepTask] }),
    );
    vi.mocked(useTaskActions).mockReturnValue(
      makeTaskActions({ startEditTask }),
    );
    act(() => {
      render(<BoardView />);
    });
    expect(startEditTask).toHaveBeenCalledWith(deepTask);
  });

  test("navigate('/dashboard', {replace:true}) is called when taskId is not found in loaded board", () => {
    mockParams.taskId = "ghost-task-id";
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ boardLoaded: true, tasks: [] }),
    );
    act(() => {
      render(<BoardView />);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  test("startEditTask is NOT called before the board has loaded", () => {
    mockParams.taskId = deepTask.id;
    const startEditTask = vi.fn();
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ boardLoaded: false, tasks: [deepTask] }),
    );
    vi.mocked(useTaskActions).mockReturnValue(
      makeTaskActions({ startEditTask }),
    );
    act(() => {
      render(<BoardView />);
    });
    expect(startEditTask).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("no navigation or modal is triggered when no taskId is present", () => {
    const startEditTask = vi.fn();
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ boardLoaded: true, tasks: [deepTask] }),
    );
    vi.mocked(useTaskActions).mockReturnValue(
      makeTaskActions({ startEditTask }),
    );
    act(() => {
      render(<BoardView />);
    });
    expect(startEditTask).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("BoardView — deep-link via route params", () => {
  const deepTask = {
    id: "route-task-id",
    rowId: "row-1",
    colId: "col-1",
    title: "Route task",
    order: "a0",
    description: "",
    checklist: [],
  };

  test("startEditTask is called for a task ID found in useParams", () => {
    mockParams.taskId = deepTask.id;
    const startEditTask = vi.fn();
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ boardLoaded: true, tasks: [deepTask] }),
    );
    vi.mocked(useTaskActions).mockReturnValue(
      makeTaskActions({ startEditTask }),
    );
    act(() => {
      render(<BoardView />);
    });
    expect(startEditTask).toHaveBeenCalledWith(deepTask);
  });

  test("navigate to /dashboard when route taskId does not match any task", () => {
    mockParams.taskId = "no-such-task";
    vi.mocked(useBoardDataState).mockReturnValue(
      makeBoardDataState({ boardLoaded: true, tasks: [] }),
    );
    act(() => {
      render(<BoardView />);
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});
