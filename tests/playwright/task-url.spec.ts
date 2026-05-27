import { expect, test } from "@playwright/test";

const CLEAN_BOARD = {
  rows: [{ id: "row-e2e-1", name: "Sample Project", color: "var(--color-row-blue)" }],
  columns: [
    { id: "col-e2e-1", name: "To Do" },
    { id: "col-e2e-2", name: "In Progress" },
    { id: "col-e2e-3", name: "Done" },
  ],
  tasks: [],
  defaultColumnNames: ["To Do", "In Progress", "Done"],
};

test.describe("Task URL", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/board", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(CLEAN_BOARD),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto("/");
  });

  test("created task gets a URL when the edit modal is opened", async ({ page }) => {
    // Wait for board to finish loading and render the add-task buttons
    await page.waitForSelector("button:has(.hugeicons--credit-card-add)");

    // Open task create modal — evaluate avoids strict-mode multi-match (3 add-task buttons)
    await page.evaluate(() => {
      (document.querySelector(
        "button:has(.hugeicons--credit-card-add)",
      ) as HTMLButtonElement)?.click();
    });
    await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();

    await page.getByRole("group", { name: "Title" }).getByRole("textbox").fill("My URL Test Task");
    await page.locator("dialog").getByRole("button", { name: "Create task" }).click();

    // Task card is visible and URL is still /
    await expect(page.getByText("My URL Test Task")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/");

    // Click the task title to open the edit modal
    await page.getByText("My URL Test Task").click();

    // URL is now /task/:id
    await expect(page).toHaveURL(/\/task\/.+/);
  });
});
