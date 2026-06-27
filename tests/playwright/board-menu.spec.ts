import { expect, testNoClerk as test } from "./fixtures.ts";

/**
 * BoardMenu.tsx — the "+" dropdown (#board-menu) wires three items:
 *   - "Create new task"           -> TaskCreateModal (with required Status/Row selects)
 *   - "Add new project row"       -> CreateRowModal (#board-config-create-new-row)
 *   - "Add new column to all rows"-> BoardConfigModal scrolled to #create-new-column
 */
test.describe("Board menu — add dropdown", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/dashboard");
    await page.locator("html[data-board-loaded='true']").waitFor({
      state: "attached",
    });
    await page.locator("#board-menu summary").first().click();
  });

  test('"Create new task" opens the task modal with empty required Status/Row selects', async ({ page }) => {
    await page.locator("#board-menu").getByText("Create new task").click();

    await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();

    const statusSelect = page.locator("#column-select-new");
    const rowSelect = page.locator("#row-select-new");
    await expect(statusSelect).toBeVisible();
    await expect(rowSelect).toBeVisible();
    // No default cell when opened from the global menu.
    await expect(statusSelect).toHaveValue("");
    await expect(rowSelect).toHaveValue("");
    // Both selects are required so the task can't be created until chosen.
    await expect(statusSelect).toHaveJSProperty("required", true);
    await expect(rowSelect).toHaveJSProperty("required", true);
  });

  test('"Add new project row" opens the create-row modal', async ({ page }) => {
    await page.locator("#board-menu").getByText("Add new project row").click();
    await expect(page.locator("#board-config-create-new-row")).toBeVisible();
    await expect(page.getByText("Create a new row")).toBeVisible();
  });

  test('"Add new column to all rows" opens board config scrolled to the create-column section', async ({ page }) => {
    await page.locator("#board-menu").getByText("Add new column to all rows")
      .click();

    await expect(page.locator("#board-config")).toBeVisible();
    await expect(page.locator("#create-new-column")).toBeInViewport();

    // The config modal's scroll container actually scrolled (not left at top).
    await expect.poll(() =>
      page.locator("dialog.modal-open .modal-box").evaluate((el) =>
        el.scrollTop
      )
    ).toBeGreaterThan(0);
  });

  test("the gear icon still opens board config at the top (no scroll)", async ({ page }) => {
    // Close the open dropdown, then use the gear toggle.
    await page.locator("#board-config-collapse-toggle").click();
    await expect(page.locator("#board-config")).toBeVisible();
    const scrollTop = await page.locator("dialog.modal-open .modal-box")
      .evaluate((el) => el.scrollTop);
    expect(scrollTop).toBe(0);
  });
});
