/// <reference lib="dom" />
import { expect, testNoClerk as test } from "./fixtures.ts";

/**
 * BoardMenu pinned-column items act as a view filter over the board:
 *   - exactly one column selected -> CondensedColumnBoard (#condensed-column-board):
 *       a single section titled with the column, where each project row pivots
 *       into a horizontal column (header = row title). Tasks stay openable,
 *       editable, creatable, and draggable.
 *   - two or more selected         -> normal row layout, columns filtered to the
 *       selected set.
 * See src/components/RowBoard.tsx, RowSection.tsx, CondensedColumnBoard.tsx.
 */
const BOARD_STATE = {
  rows: [
    {
      id: "row-eng",
      title: "Engineering",
      color: "var(--color-row-blue)",
      order: "a0",
    },
    {
      id: "row-mkt",
      title: "Marketing",
      color: "var(--color-row-red)",
      order: "a1",
    },
  ],
  columns: [
    {
      id: "col-todo",
      title: "To Do",
      order: "a0",
      pinnedToShortcut: false,
      pinnedToDock: false,
      icon: null,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
    {
      id: "col-prog",
      title: "In Progress",
      order: "a1",
      pinnedToShortcut: true,
      pinnedToDock: false,
      icon: null,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
    {
      id: "col-done",
      title: "Done",
      order: "a2",
      pinnedToShortcut: true,
      pinnedToDock: false,
      icon: null,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
  ],
  tasks: [
    {
      id: "task-todo-eng",
      rowId: "row-eng",
      colId: "col-todo",
      title: "Spec it",
      description: "",
      checklist: [],
      order: "a0",
    },
    {
      id: "task-prog-eng",
      rowId: "row-eng",
      colId: "col-prog",
      title: "Build API",
      description: "",
      checklist: [],
      order: "a0",
    },
    {
      id: "task-prog-mkt",
      rowId: "row-mkt",
      colId: "col-prog",
      title: "Write copy",
      description: "",
      checklist: [],
      order: "a0",
    },
    {
      id: "task-done-eng",
      rowId: "row-eng",
      colId: "col-done",
      title: "Ship it",
      description: "",
      checklist: [],
      order: "a0",
    },
  ],
};

// Click a pinned column item in #board-menu by its title.
function menuItem(page: import("@playwright/test").Page, title: string) {
  return page.locator("#board-menu a").filter({ hasText: title });
}

test.describe("Board menu — column view filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, BOARD_STATE);
    await page.goto("/dashboard");
    await page.locator("html[data-board-loaded='true']").waitFor({
      state: "attached",
    });
    await expect(page.locator("#row-section-row-eng")).toBeVisible();
  });

  test("selecting one column condenses the board into a single pivoted row", async ({ page }) => {
    await menuItem(page, "In Progress").click();

    // The whole board collapses into a single condensed section titled by the
    // column, and the per-row sections are gone.
    const condensed = page.locator("#condensed-column-board");
    await expect(condensed).toHaveCount(1);
    await expect(condensed.getByRole("heading", { name: "In Progress" }))
      .toBeVisible();
    await expect(page.locator("[id^='row-section-']")).toHaveCount(0);

    // Each project row pivots into a column whose header is the row title,
    // holding that row's In-Progress tasks.
    const engCol = page.locator("#column-card-row-eng-col-prog");
    const mktCol = page.locator("#column-card-row-mkt-col-prog");
    await expect(engCol.getByText("Engineering", { exact: true }))
      .toBeVisible();
    await expect(mktCol.getByText("Marketing", { exact: true })).toBeVisible();
    await expect(engCol.getByText("Build API", { exact: true })).toBeVisible();
    await expect(mktCol.getByText("Write copy", { exact: true })).toBeVisible();

    // The active menu item adopts the hover background.
    await expect(menuItem(page, "In Progress")).toHaveClass(
      /bg-base-content\/10/,
    );
  });

  test("selecting multiple columns keeps the row layout but filters columns", async ({ page }) => {
    await menuItem(page, "In Progress").click();
    await menuItem(page, "Done").click();

    // Normal row layout is preserved (both rows still rendered, no pivot).
    await expect(page.locator("#condensed-column-board")).toHaveCount(0);
    await expect(page.locator("[id^='row-section-']")).toHaveCount(2);

    // Only the two selected columns show in each row; To Do is hidden.
    const engRow = page.locator("#row-columns-row-eng");
    await expect(engRow.getByText("In Progress", { exact: true }))
      .toBeVisible();
    await expect(engRow.getByText("Done", { exact: true })).toBeVisible();
    await expect(engRow.getByText("To Do", { exact: true })).toHaveCount(0);

    const mktRow = page.locator("#row-columns-row-mkt");
    await expect(mktRow.getByText("In Progress", { exact: true }))
      .toBeVisible();
    await expect(mktRow.getByText("Done", { exact: true })).toBeVisible();
    await expect(mktRow.getByText("To Do", { exact: true })).toHaveCount(0);
  });

  test("a task can be dragged between pivoted columns in the condensed view", async ({ page }) => {
    await menuItem(page, "In Progress").click();

    const engCol = page.locator("#column-card-row-eng-col-prog");
    const mktCol = page.locator("#column-card-row-mkt-col-prog");
    await expect(engCol.locator("article#task-prog-eng")).toBeVisible();

    // Dispatch the HTML5 drag events directly (real OS drags are flaky in CI).
    // dragstart runs in its own round trip so React flushes draggedTask first.
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

    await page.evaluate((dataTransfer) => {
      document.querySelector("article#task-prog-eng")!.dispatchEvent(
        new DragEvent("dragstart", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
    }, dataTransfer);

    await page.evaluate((dataTransfer) => {
      const target = document.querySelector("#column-card-row-mkt-col-prog")!;
      const fire = (el: Element, type: string) =>
        el.dispatchEvent(
          new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          }),
        );
      fire(target, "dragover");
      fire(target, "drop");
      document.querySelector("article#task-prog-eng")!.dispatchEvent(
        new DragEvent("dragend", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
    }, dataTransfer);

    // The task moved to Marketing's column (still In Progress) and left Engineering.
    await expect(mktCol.locator("article#task-prog-eng")).toBeVisible();
    await expect(engCol.locator("article#task-prog-eng")).toHaveCount(0);
  });

  test("a task can be edited from the condensed view", async ({ page }) => {
    await menuItem(page, "In Progress").click();

    await page.locator("#column-card-row-eng-col-prog").getByText("Build API", {
      exact: true,
    }).click();

    await expect(page.getByRole("heading", { name: "Edit task" }))
      .toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/task\/task-prog-eng/);
  });

  test("creating a task from a pivoted column pre-fills its status and row", async ({ page }) => {
    await menuItem(page, "In Progress").click();

    // The "+" add-task button on the Engineering pivoted column.
    await page.locator("#column-card-row-eng-col-prog button").first().click();

    await expect(page.getByRole("heading", { name: "Add task" })).toBeVisible();

    // Status = the selected column (In Progress), Row = the pivoted row (Engineering).
    await expect(page.locator("#column-select-new")).toHaveValue("col-prog");
    await expect(page.locator("#row-select-new")).toHaveValue("row-eng");
  });
});
