import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { mockColumn, secondColumn } from "./setup.ts";
import StatusSteps from "@components/task/form-elements/StatusSteps.tsx";

const trashColumn = {
  ...mockColumn,
  id: "col-trash",
  title: "Trash",
  isTrash: true,
};

describe("StatusSteps", () => {
  test("does not offer the Trash column", () => {
    render(
      <StatusSteps
        taskId="task-1"
        columns={[mockColumn, trashColumn]}
        selectedColId={mockColumn.id}
      />,
    );
    expect(screen.queryByTestId("status-step-col-trash")).toBeNull();
    expect(screen.getByTestId(`status-step-${mockColumn.id}`)).toBeTruthy();
  });

  test("checks the selected column and reports a new selection", () => {
    const onSelect = vi.fn();
    render(
      <StatusSteps
        taskId="task-1"
        columns={[mockColumn, secondColumn]}
        selectedColId={mockColumn.id}
        onSelect={onSelect}
      />,
    );
    expect(
      screen.getByRole("radio", { name: mockColumn.title }),
    ).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("radio", { name: secondColumn.title }));
    expect(onSelect).toHaveBeenCalledWith(secondColumn.id);
  });
});
