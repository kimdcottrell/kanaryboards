import { expect, testNoClerk as test } from "./fixtures.ts";

const CLEAN_BOARD = {
  rows: [{
    id: "row-e2e-1",
    title: "Test Project",
    color: "var(--color-row-blue)",
    order: "a0",
  }],
  columns: [
    { id: "col-e2e-1", title: "To Do", order: "a0" },
    { id: "col-e2e-2", title: "In Progress", order: "a1" },
    { id: "col-e2e-3", title: "Done", order: "a2" },
  ],
  tasks: [],
};

test.describe("Task URL", () => {
  test.beforeEach(async ({ page }) => {
    // Unauthenticated: the board is read from localStorage, so seed it there
    // (an empty board would render the create-row empty state, not a row).
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, CLEAN_BOARD);
    await page.goto("/dashboard");
  });

  test("created task gets a URL when the edit modal is opened", async ({ page }) => {
    // Wait for board to finish loading and render the add-task buttons
    await page.waitForSelector("button:has(.hugeicons--add-01)");

    // Open task create modal — .first() avoids strict-mode multi-match (3 add-task buttons)
    await page.locator("button:has(.hugeicons--add-01)").first()
      .click();
    await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();

    await page.getByRole("textbox", { name: "Title" }).fill(
      "My URL Test Task",
    );
    await page.locator("dialog").getByRole("button", { name: "Create task" })
      .click();

    // Task card is visible and URL is still /dashboard. Use the heading role to
    // disambiguate from the column-settings delete preview, which also lists the
    // task title as a <span>.
    await expect(page.getByRole("heading", { name: "My URL Test Task" }))
      .toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/dashboard");

    // Click the task title to open the edit modal
    await page.getByRole("heading", { name: "My URL Test Task" }).click();

    // URL is now /dashboard/task/:id
    await expect(page).toHaveURL(/\/dashboard\/task\/.+/);
  });
});
