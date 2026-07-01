/// <reference lib="dom" />
import { expect, testNoClerk as test } from "./fixtures.ts";

/**
 * BoardDock (src/components/BoardDock.tsx) is the small-screen counterpart to
 * #board-menu. Below the `lg` breakpoint the DaisyUI dock (`.dock`, fixed to the
 * bottom) is shown and #board-menu is hidden; at `lg`+ this reverses. The dock
 * surfaces the single column pinned via `pinnedToDock`, and clicking it drives
 * the same view filter as the shortcut menu (one column selected -> the board
 * condenses into CondensedColumnBoard).
 */
const BOARD_STATE = {
  rows: [
    {
      id: "row-eng",
      title: "Engineering",
      color: "var(--color-row-blue)",
      order: "a0",
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
      pinnedToDock: true,
      icon: null,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
  ],
  tasks: [
    {
      id: "task-prog-eng",
      rowId: "row-eng",
      colId: "col-prog",
      title: "Build API",
      description: "",
      checklist: [],
      order: "a0",
    },
  ],
};

test.describe("BoardDock — small-screen bottom nav", () => {
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

  test("dock replaces #board-menu below lg and filters via its pinned column", async ({ page }) => {
    const dock = page.locator("#board-dock");
    const boardMenu = page.locator("#board-menu");

    // Below lg: the dock is shown, #board-menu is hidden.
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(dock).toBeVisible();
    await expect(boardMenu).toBeHidden();

    // The dock surfaces the single pinnedToDock column and drives the view
    // filter: selecting it condenses the board into a single pivoted section.
    const dockColumn = dock.locator("button").filter({
      hasText: "In Progress",
    });
    await expect(dockColumn).toBeVisible();
    await dockColumn.click();
    await expect(page.locator("#condensed-column-board")).toBeVisible();
  });

  test("dock is hidden and #board-menu shown at lg+", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator("#board-menu")).toBeVisible();
    await expect(page.locator("#board-dock")).toBeHidden();
  });

  test("the config-only dock preview does not leak onto the closed dashboard", async ({ page }) => {
    // The isPreview dock lives inside the (closed) board config modal. It must
    // not render a phantom fixed dock over the dashboard at any breakpoint.
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(page.locator("#board-config-column-settings")).toBeHidden();
    await expect(page.locator("#board-dock")).toHaveCount(1);
  });
});
