/// <reference lib="dom" />
import type { Page } from "@playwright/test";
import { expect, fillStable, testNoClerk as test } from "./fixtures.ts";

/**
 * Unsaved edit-modal changes are kept in localStorage under `task+${id}` when
 * the modal is closed without saving (src/components/task/editDraftStore.ts),
 * restored on reopen, and flagged on the task card until saved or discarded.
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
    { id: "col-e2e-2", title: "In Progress", order: "a1" },
    { id: "col-e2e-trash", title: "Trash", order: "a2", isTrash: true },
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
    {
      id: "task-e2e-2",
      rowId: "row-e2e-1",
      colId: "col-e2e-1",
      title: "Review PR",
      description: "",
      checklist: [],
      order: "a1",
    },
    {
      id: "task-e2e-trashed",
      rowId: "row-e2e-1",
      colId: "col-e2e-trash",
      title: "Old idea",
      description: "",
      checklist: [],
      order: "a0",
      trashedAt: new Date().toISOString(),
      preTrashColId: "col-e2e-1",
    },
  ],
};

const BADGE = "Edited but not saved";

function storedDraft(page: Page, taskId: string) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    `task+${taskId}`,
  );
}

async function openTask(page: Page, title: string) {
  await page.locator("article").getByText(title, { exact: true }).click();
  await expect(page.locator("dialog.modal-open")).toBeVisible();
}

async function editTitleAndCancel(page: Page, from: string, to: string) {
  await openTask(page, from);
  await fillStable(page.getByRole("textbox", { name: "Title" }), to);
  await page.locator("dialog.modal-open").getByRole("button", {
    name: "Cancel",
  }).click();
  await expect(page.locator("dialog.modal-open")).toHaveCount(0);
}

const lastEditedAlert = (page: Page) =>
  page.locator("dialog.modal-open").getByRole("alert").filter({
    hasText: "last edited",
  });

test.describe("Unsaved task edits", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, BOARD_STATE);
    await page.goto("/dashboard");
    await expect(page.locator("#row-section-row-e2e-1")).toBeVisible();
  });

  test("keeps changes across several closes without saving", async ({ page }) => {
    await editTitleAndCancel(page, "Write specs", "Write specs v1");
    expect((await storedDraft(page, "task-e2e-1")).draft.title).toBe(
      "Write specs v1",
    );

    // The board itself is untouched: the card still shows the saved title.
    const card = page.locator("article#task-e2e-1");
    await expect(card.getByText("Write specs", { exact: true })).toBeVisible();

    // Reopen: the first edit is restored. Edit again, close with the X button.
    await openTask(page, "Write specs");
    const title = page.getByRole("textbox", { name: "Title" });
    await expect(title).toHaveValue("Write specs v1");
    await expect(lastEditedAlert(page)).toBeVisible();
    await fillStable(title, "Write specs v2");
    await page.locator(
      "#row-select-task-e2e-1 label:has(input[value='row-e2e-2'])",
    ).click();
    await page.locator(".modal-open button:has(.hugeicons--cancel-01)")
      .click();
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);

    const { draft } = await storedDraft(page, "task-e2e-1");
    expect(draft.title).toBe("Write specs v2");
    expect(draft.rowId).toBe("row-e2e-2");

    // Reopen: both edits are restored.
    await openTask(page, "Write specs");
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Write specs v2",
    );
    await expect(
      page.locator("#row-select-task-e2e-1 input[value='row-e2e-2']"),
    ).toBeChecked();
    await expect(lastEditedAlert(page)).toBeVisible();
  });

  test("closing without changes stores nothing and shows no alert", async ({ page }) => {
    await openTask(page, "Write specs");
    await expect(lastEditedAlert(page)).toHaveCount(0);
    await page.locator("dialog.modal-open").getByRole("button", {
      name: "Cancel",
    }).click();

    expect(await storedDraft(page, "task-e2e-1")).toBeNull();
    await expect(page.locator("article#task-e2e-1").getByText(BADGE))
      .toHaveCount(0);
  });

  test("clicking into an empty description and leaving stores nothing", async ({ page }) => {
    // An empty editor serializes to an empty-paragraph document, not "".
    const description = () =>
      page.locator("dialog.modal-open [contenteditable='true']").first();

    // Click in, then Cancel.
    await openTask(page, "Write specs");
    await description().click();
    await page.locator("dialog.modal-open").getByRole("button", {
      name: "Cancel",
    }).click();
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);
    expect(await storedDraft(page, "task-e2e-1")).toBeNull();

    // Click in, click out (the editor switches back to "Task Details"), then X.
    await openTask(page, "Write specs");
    await description().click();
    await page.getByRole("textbox", { name: "Title" }).click();
    await page.locator(".modal-open button:has(.hugeicons--cancel-01)")
      .click();
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);
    expect(await storedDraft(page, "task-e2e-1")).toBeNull();

    await expect(page.locator("article#task-e2e-1").getByText(BADGE))
      .toHaveCount(0);
  });

  test("flags only the task card with unsaved changes", async ({ page }) => {
    const edited = page.locator("article#task-e2e-1");
    const untouched = page.locator("article#task-e2e-2");
    await expect(edited.getByText(BADGE)).toHaveCount(0);

    await editTitleAndCancel(page, "Write specs", "Write specs edited");

    await expect(edited.getByText(BADGE)).toBeVisible();
    await expect(untouched.getByText(BADGE)).toHaveCount(0);
  });

  test("saving clears the stored changes", async ({ page }) => {
    await editTitleAndCancel(page, "Write specs", "Write specs edited");
    await expect(page.locator("article#task-e2e-1").getByText(BADGE))
      .toBeVisible();

    await openTask(page, "Write specs");
    await page.locator("dialog.modal-open").getByRole("button", {
      name: "Save",
    }).click();
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);

    expect(await storedDraft(page, "task-e2e-1")).toBeNull();
    const card = page.locator("article#task-e2e-1");
    await expect(card.getByText("Write specs edited", { exact: true }))
      .toBeVisible();
    await expect(card.getByText(BADGE)).toHaveCount(0);

    await openTask(page, "Write specs edited");
    await expect(lastEditedAlert(page)).toHaveCount(0);
  });

  test("trashing clears the stored changes", async ({ page }) => {
    await editTitleAndCancel(page, "Write specs", "Write specs edited");
    expect(await storedDraft(page, "task-e2e-1")).not.toBeNull();

    await openTask(page, "Write specs");
    await page.locator("dialog.modal-open").getByRole("button", {
      name: "Trash",
      exact: true,
    }).click();
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);

    expect(await storedDraft(page, "task-e2e-1")).toBeNull();
    await expect(page.locator("article#task-e2e-1").getByText(BADGE))
      .toHaveCount(0);
  });

  test("deleting forever clears the stored changes", async ({ page }) => {
    // A trashed task can't be edited, so plant an entry for it directly.
    const trashed = BOARD_STATE.tasks.find((t) => t.id === "task-e2e-trashed");
    await page.evaluate((draft) => {
      localStorage.setItem(
        "task+task-e2e-trashed",
        JSON.stringify({ draft, updatedAt: Date.now() }),
      );
    }, trashed);

    await openTask(page, "Old idea");
    await page.locator("dialog.modal-open").getByRole("button", {
      name: "Delete forever",
      exact: true,
    }).click();
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);

    expect(await storedDraft(page, "task-e2e-trashed")).toBeNull();
  });

  test("several tasks can hold unsaved changes at once", async ({ page }) => {
    await editTitleAndCancel(page, "Write specs", "Write specs edited");
    await editTitleAndCancel(page, "Review PR", "Review PR edited");

    expect((await storedDraft(page, "task-e2e-1")).draft.title).toBe(
      "Write specs edited",
    );
    expect((await storedDraft(page, "task-e2e-2")).draft.title).toBe(
      "Review PR edited",
    );
    await expect(page.locator("article#task-e2e-1").getByText(BADGE))
      .toBeVisible();
    await expect(page.locator("article#task-e2e-2").getByText(BADGE))
      .toBeVisible();

    // Each task restores its own changes.
    await openTask(page, "Review PR");
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Review PR edited",
    );
    await page.locator("dialog.modal-open").getByRole("button", {
      name: "Save",
    }).click();
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);

    // Saving one leaves the other's changes in place.
    expect(await storedDraft(page, "task-e2e-2")).toBeNull();
    expect(await storedDraft(page, "task-e2e-1")).not.toBeNull();
    await expect(page.locator("article#task-e2e-2").getByText(BADGE))
      .toHaveCount(0);
    await expect(page.locator("article#task-e2e-1").getByText(BADGE))
      .toBeVisible();

    await openTask(page, "Write specs");
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Write specs edited",
    );
  });
});
