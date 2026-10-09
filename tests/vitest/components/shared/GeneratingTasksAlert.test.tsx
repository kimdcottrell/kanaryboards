import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import GeneratingTasksAlert from "@components/shared/GeneratingTasksAlert.tsx";

describe("GeneratingTasksAlert", () => {
  test("renders the provided status text", () => {
    render(<GeneratingTasksAlert status="Generating tasks..." />);
    // getByText throws if the text is absent, so this asserts it renders.
    expect(screen.getByText("Generating tasks...")).toBeTruthy();
  });

  test("uses the alert-info style", () => {
    const { container } = render(<GeneratingTasksAlert status="Working" />);
    expect(container.querySelector(".alert.alert-info")).not.toBeNull();
  });

  test("uses the alert-success style for the success variant", () => {
    const { container } = render(
      <GeneratingTasksAlert status="Done" variant="success" />,
    );
    expect(container.querySelector(".alert.alert-success")).not.toBeNull();
    expect(container.querySelector(".alert-info")).toBeNull();
  });

  test("uses the alert-error style for the error variant", () => {
    const { container } = render(
      <GeneratingTasksAlert status="Failed" variant="error" />,
    );
    expect(container.querySelector(".alert.alert-error")).not.toBeNull();
    expect(container.querySelector(".alert-info")).toBeNull();
  });
});
