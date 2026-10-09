/// <reference lib="dom" />
import type { Page } from "@playwright/test";
import {
  expect,
  fillStable,
  openSecondTab,
  testNoClerk as test,
} from "./fixtures.ts";

/**
 * Each autosave is broadcast to the browser's other tabs over BroadcastChannel
 * and applied there with BOARD/SYNC (src/components/context/BoardContext.tsx).
 * Open task modals survive a sync, except when no rows are left.
 */
const BOARD_STATE = {
  rows: [
    {
      id: "row-e2e-1",
      title: "Engineering",
      color: "var(--color-row-blue)",
      order: "a0",
    },
    {
      id: "row-e2e-2",
      title: "Marketing",
      color: "var(--color-row-red)",
      order: "a1",
    },
  ],
  columns: [
    { id: "col-e2e-1", title: "To Do", order: "a0" },
    { id: "col-e2e-trash", title: "Trash", order: "a1", isTrash: true },
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

async function gotoBoard(page: Page) {
  await page.goto("/dashboard");
  await expect(page.locator("#row-section-row-e2e-1")).toBeVisible();
}

async function deleteRow(page: Page, rowId: string, title: string) {
  await page.locator(`#row-section-${rowId}`).getByRole("button", {
    name: `Delete project ${title}`,
  }).click();
  await expect(page.locator(`#row-section-${rowId}`)).toHaveCount(0);
}

async function openAddMenu(page: Page) {
  await page.locator("#board-menu [data-testid='board-menu-add-dropdown']")
    .click();
}

test.describe("Cross-tab board sync", () => {
  let other: Page;

  test.beforeEach(async ({ page }) => {
    await page.context().addInitScript((board) => {
      // Seed once: later loads in this context must see the synced board.
      if (!localStorage.getItem("kanby-v0-1-0")) {
        localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
      }
    }, BOARD_STATE);
    page.on("dialog", (dialog) => dialog.accept());
    other = await openSecondTab(page);
    await gotoBoard(page);
    await gotoBoard(other);
  });

  test("deleting the last row closes task modals in the other tab", async ({ page }) => {
    await other.locator("article").getByText("Write specs", { exact: true })
      .click();
    await expect(other.locator("dialog.modal-open")).toBeVisible();

    await deleteRow(page, "row-e2e-1", "Engineering");
    await deleteRow(page, "row-e2e-2", "Marketing");

    await expect(other.locator("dialog.modal-open")).toHaveCount(0);
    await expect(other.locator("#row-section-row-e2e-2")).toHaveCount(0);

    await openAddMenu(other);
    await expect(other.locator("#board-menu").getByText("Add new project row"))
      .toBeVisible();
    await expect(other.locator("#board-menu").getByText("Create new task"))
      .toHaveCount(0);
  });

  test("keeps the edit modal open when its row is deleted elsewhere, and saving adds the task back", async ({ page }) => {
    await other.locator("article").getByText("Write specs", { exact: true })
      .click();
    const title = other.getByRole("textbox", { name: "Title" });
    await fillStable(title, "Write specs v2");

    await deleteRow(page, "row-e2e-1", "Engineering");

    // Still open with the unsaved title, but no project selected.
    await expect(other.locator("#row-section-row-e2e-1")).toHaveCount(0);
    await expect(other.locator("dialog.modal-open")).toBeVisible();
    await expect(title).toHaveValue("Write specs v2");
    const projects = other.locator("#row-select-task-e2e-1");
    await expect(projects.locator("input:checked")).toHaveCount(0);

    await projects.locator("label:has(input[value='row-e2e-2'])").click();
    await other.locator("dialog.modal-open").getByRole("button", {
      name: "Save",
    }).click();
    await expect(other.locator("dialog.modal-open")).toHaveCount(0);

    for (const tab of [other, page]) {
      await expect(
        tab.locator("#row-section-row-e2e-2").getByText("Write specs v2", {
          exact: true,
        }),
      ).toBeVisible();
    }
  });

  test("hides Create new task when the board has no rows", async ({ page }) => {
    await deleteRow(page, "row-e2e-1", "Engineering");
    await deleteRow(page, "row-e2e-2", "Marketing");
    await openAddMenu(page);
    await expect(page.locator("#board-menu").getByText("Add new project row"))
      .toBeVisible();
    await expect(page.locator("#board-menu").getByText("Create new task"))
      .toHaveCount(0);
  });
});
