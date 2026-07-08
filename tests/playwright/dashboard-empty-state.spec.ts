import { expect, testNoClerk as test } from "./fixtures.ts";

/**
 * With no saved board, reset() seeds default columns but no rows, so the
 * dashboard renders the empty state (RowBoard.tsx): a prompt plus the inline
 * CreateRowSection form. Creating the first row replaces it with the board.
 */
test.describe("Dashboard — empty state", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/dashboard");
    await page.locator("html[data-board-loaded='true']").waitFor({
      state: "attached",
    });
  });

  test("shows the empty-state prompt and inline create-row form, no rows", async ({ page }) => {
    await expect(page.getByText("Your dashboard is empty.")).toBeVisible();
    await expect(
      page.getByText("Create your first project to get started."),
    ).toBeVisible();
    // The always-mounted (hidden) CreateRowModal also holds a create-new-row
    // node, so scope to the visible inline one.
    await expect(page.locator("[data-testid='create-new-row']:visible"))
      .toBeVisible();
    // No project rows are rendered.
    await expect(page.locator("[id^='row-section-']")).toHaveCount(0);
  });

  test("creating the first row replaces the empty state with the board", async ({ page }) => {
    const form = page.locator("[data-testid='create-new-row']:visible");
    await form.getByPlaceholder(
      "A project name, a category for large project tasks, etc.",
    ).fill("My First Project");
    await form.getByRole("button", { name: "Add Row" }).click();

    // The new row renders and the empty-state prompt is gone.
    await expect(page.locator("[id^='row-section-']")).toHaveCount(1);
    await expect(page.getByText("Your dashboard is empty.")).toHaveCount(0);
  });
});
