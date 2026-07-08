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
});
