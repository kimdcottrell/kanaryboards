/// <reference lib="dom" />
import type { Page } from "@playwright/test";
import { expect, testNoClerk as test } from "./fixtures.ts";

/**
 * Verifies improved rendering: modal-only state (ChecklistAIState,
 * TaskCreateState, TaskEditState, RowFormState) is isolated into its own
 * context, so typing into those fields no longer re-renders the board-shell
 * components (RowSection, ColumnCard, TaskCard, BoardConfiguration). Each
 * board-shell component exposes its render count via `data-render-count`
 * (see src/lib/use-render-count.ts, non-production-only).
 */
const BOARD_STATE = {
  rows: [
    { id: "row-e2e-1", title: "Engineering", color: "var(--color-row-blue)", order: "a0" },
  ],
  columns: [
    { id: "col-e2e-1", title: "To Do", order: "a0" },
  ],
  tasks: [
    {
      id: "task-e2e-1",
      rowId: "row-e2e-1",
      colId: "col-e2e-1",
      title: "Write specs",
      description: "",
      checklist: [],
      order: "a0",
    },
  ],
};

test.describe("Render isolation (Phase 2 context split)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, BOARD_STATE);
    await page.goto("/");
    await expect(page.locator("#row-section-row-e2e-1")).toBeVisible();
  });

  // The checklist generation collapse animates its `grid-template-rows` over
  // 0.2s (see daisyUI's .collapse). Wait for that transition to finish before
  // interacting with its contents, so the prompt input is laid out and stable.
  async function waitForChecklistCollapseOpen(page: Page) {
    await page.locator("#checklist-gen-collapse").evaluate((el: Element) =>
      new Promise<void>((resolve) => {
        const tick = () => {
          const animating = el.getAnimations({ subtree: true }).length > 0;
          const content = el.querySelector("#checklist-gen-collapse-content");
          const open = (content?.getBoundingClientRect().height ?? 0) > 0;
          if (!animating && open) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
    );
  }

  async function shellRenderCounts(page: Page) {
    return {
      row: await page.locator("#row-section-row-e2e-1").getAttribute(
        "data-render-count",
      ),
      column: await page.locator("#column-card-row-e2e-1-col-e2e-1")
        .getAttribute("data-render-count"),
      task: await page.locator("article#task-e2e-1").getAttribute(
        "data-render-count",
      ),
      boardConfig: await page.locator("#board-config").getAttribute(
        "data-render-count",
      ),
    };
  }

  test("typing in the edit-task checklist AI prompt does not re-render board-shell components", async ({ page }) => {
    await page.locator("#row-columns-row-e2e-1").getByText("Write specs", {
      exact: true,
    }).click();
    await expect(page.getByRole("heading", { name: "Edit task" }))
      .toBeVisible();
    await page.locator("#checklist-gen-collapse-toggle").click();
    await waitForChecklistCollapseOpen(page);

    // Opening the collapse auto-populates the prompt from the task title
    // (see ChecklistGenerationCollapse) — wait for that dispatch to settle
    // before snapshotting render counts, so it doesn't race with our fill.
    const prompt = page.locator(
      "#checklist-gen-collapse-content input[type='text']",
    );
    await expect(prompt).toHaveValue("Write specs");

    const before = await shellRenderCounts(page);
    expect(before.row).not.toBeNull();

    await prompt.fill("Break this down into steps");
    await expect(prompt).toHaveValue("Break this down into steps");

    expect(await shellRenderCounts(page)).toEqual(before);
  });

  test("typing in the create-task checklist AI prompt does not re-render board-shell components", async ({ page }) => {
    await page.locator("#column-card-row-e2e-1-col-e2e-1").locator(
      "button:has(.hugeicons--credit-card-add)",
    ).click();
    await expect(page.getByRole("heading", { name: "Add task" }))
      .toBeVisible();
    await page.locator("#checklist-gen-collapse-toggle").click();
    await waitForChecklistCollapseOpen(page);

    const before = await shellRenderCounts(page);
    expect(before.row).not.toBeNull();

    const prompt = page.locator(
      "#checklist-gen-collapse-content input[type='text']",
    );
    await prompt.fill("Generate subtasks");
    await expect(prompt).toHaveValue("Generate subtasks");

    expect(await shellRenderCounts(page)).toEqual(before);
  });

  test("typing a new row name in board configuration does not re-render row sections, column cards, or task cards", async ({ page }) => {
    await page.locator("#board-config-collapse-toggle").click();
    const before = await shellRenderCounts(page);
    expect(before.row).not.toBeNull();

    const rowNameInput = page.locator("#board-config-create-new-row")
      .getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      );
    await rowNameInput.fill("Design");
    await expect(rowNameInput).toHaveValue("Design");

    const after = await shellRenderCounts(page);
    expect(after.row).toEqual(before.row);
    expect(after.column).toEqual(before.column);
    expect(after.task).toEqual(before.task);
  });
});
