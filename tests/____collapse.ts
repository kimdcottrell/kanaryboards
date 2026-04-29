import { expect, test } from "@playwright/test";

test.describe("Collapse functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
  });

  /**
   * BoardConfiguration.jsx — DaisyUI checkbox-based collapse.
   * IDs: #board-config (section wrapper)
   *      #board-confi // use: {
  //   baseURL: "http://app:4321",
  //   trace: "on-first-retry",
  // },g-collapse-toggle (checkbox)
   *      #board-config-collapse-title, #board-config-collapse-content
   *      #board-config-create-new-row, #board-config-column-settings
   *      #board-config-row-display-settings, #board-config-danger-zone
   */
  test.describe("Board Configuration section", () => {
    test("is closed by default and opens when toggled", async ({ page }) => {
      const toggle = page.locator("#board-config-collapse-toggle");
      const content = page.locator("#board-config-collapse-content");

      await expect(toggle).not.toBeChecked();
      await expect(content.getByText("Add rows and columns, then place tasks"))
        .not.toBeVisible();

      await toggle.click();

      await expect(toggle).toBeChecked();
      await expect(content.getByText("Add rows and columns, then place tasks"))
        .toBeVisible();
    });

    test("closes when toggled again after opening", async ({ page }) => {
      const toggle = page.locator("#board-config-collapse-toggle");
      const content = page.locator("#board-config-collapse-content");

      await toggle.click();
      await expect(toggle).toBeChecked();

      await toggle.click();

      await expect(toggle).not.toBeChecked();
      await expect(content.getByText("Add rows and columns, then place tasks"))
        .not.toBeVisible();
    });
  });

  /**
   * RowSection.jsx — custom React state collapse.
   * IDs: #row-section-{rowId}, #row-collapse-btn-{rowId}, #row-columns-{rowId}
   * The rowId is read from the section's id attribute at runtime since it is
   * generated dynamically and stored in localStorage.
   */
  test.describe("Row section", () => {
    test("is expanded by default and collapses when toggled", async ({ page }) => {
      const rowSection = page.locator("[id^='row-section-']").first();
      const rowId = await rowSection.getAttribute("id").then((
        id: string | null,
      ) => id!.replace("row-section-", ""));
      const collapseBtn = page.locator(`#row-collapse-btn-${rowId}`);
      const columns = page.locator(`#row-columns-${rowId}`);

      await expect(collapseBtn).toBeVisible();
      await expect(columns).toBeAttached();

      await collapseBtn.click();

      await expect(collapseBtn).toHaveAttribute("aria-label", "Expand row");
      await expect(columns).not.toBeAttached();
    });

    test("re-expands when toggled again", async ({ page }) => {
      const rowSection = page.locator("[id^='row-section-']").first();
      const rowId = await rowSection.getAttribute("id").then((
        id: string | null,
      ) => id!.replace("row-section-", ""));
      const collapseBtn = page.locator(`#row-collapse-btn-${rowId}`);
      const columns = page.locator(`#row-columns-${rowId}`);

      await collapseBtn.click();
      await expect(columns).not.toBeAttached();

      await collapseBtn.click();

      await expect(columns).toBeAttached();
      await expect(collapseBtn).toHaveAttribute("aria-label", "Collapse row");
    });
  });

  /**
   * ChecklistSection.jsx (ChecklistGenerationCollapse) — DaisyUI collapse with
   * React-managed collapse-open class. Lives inside the task create modal.
   * IDs: #checklist-gen-collapse, #checklist-gen-collapse-toggle,
   *      #checklist-gen-collapse-content
   */
  test.describe("Checklist AI generation section (task create modal)", () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => {
        (document.querySelector(
          "button:has(.hugeicons--credit-card-add)",
        ) as HTMLButtonElement)?.click();
      });
      await expect(page.getByRole("heading", { name: "Add task" }))
        .toBeVisible();
    });

    test("is closed by default and opens when toggled", async ({ page }) => {
      const collapse = page.locator("#checklist-gen-collapse");
      const toggle = page.locator("#checklist-gen-collapse-toggle");
      const content = page.locator("#checklist-gen-collapse-content");

      await expect(collapse).not.toHaveClass(/collapse-open/);
      await expect(
        content.getByText("What task do you need broken down into subtasks?"),
      ).not.toBeVisible();

      await toggle.click();

      await expect(collapse).toHaveClass(/collapse-open/);
      await expect(
        content.getByText("What task do you need broken down into subtasks?"),
      ).toBeVisible();
    });

    test("closes when toggled again after opening", async ({ page }) => {
      const collapse = page.locator("#checklist-gen-collapse");
      const toggle = page.locator("#checklist-gen-collapse-toggle");
      const content = page.locator("#checklist-gen-collapse-content");

      await toggle.click();
      await expect(collapse).toHaveClass(/collapse-open/);

      await toggle.click();

      await expect(collapse).not.toHaveClass(/collapse-open/);
      await expect(
        content.getByText("What task do you need broken down into subtasks?"),
      ).not.toBeVisible();
    });
  });
});
