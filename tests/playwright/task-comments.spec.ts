import { expect, testNoClerk as test } from "./fixtures.ts";
import type { Page } from "@playwright/test";

const BOARD = {
  rows: [{
    id: "row-e2e-1",
    title: "Test Project",
    color: "var(--color-row-blue)",
    order: "a0",
  }],
  columns: [{ id: "col-e2e-1", title: "To Do", order: "a0" }],
  tasks: [{
    id: "task-e2e-1",
    rowId: "row-e2e-1",
    colId: "col-e2e-1",
    title: "Write specs",
    description: "",
    checklist: [],
    order: "a0",
  }],
};

const lexical = (text: string) =>
  JSON.stringify({
    root: {
      type: "root",
      version: 1,
      direction: null,
      format: "",
      indent: 0,
      children: [{
        type: "paragraph",
        version: 1,
        direction: null,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        children: [{
          type: "text",
          version: 1,
          text,
          detail: 0,
          format: 0,
          mode: "normal",
          style: "",
        }],
      }],
    },
  });

// Seeds `count` comments, "Comment 1" oldest … "Comment N" newest.
function seededComments(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `comment-${i + 1}`,
    taskId: "task-e2e-1",
    authorId: null,
    authorName: "You",
    authorImageUrl: null,
    content: lexical(`Comment ${i + 1}`),
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    updatedAt: null,
  }));
}

async function openTask(page: Page, commentCount = 0) {
  await page.addInitScript(([board, comments]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    localStorage.setItem(
      "kanby-comments-v0-1-0",
      JSON.stringify(comments.length ? { "task-e2e-1": comments } : {}),
    );
  }, [BOARD, seededComments(commentCount)] as const);
  await page.goto("/dashboard/task/task-e2e-1");
  const modal = page.locator("dialog.modal-open");
  await expect(modal.getByRole("button", { name: "Save", exact: true }))
    .toBeVisible();
  return modal;
}

test.describe("Task comments", () => {
  test("add, edit and delete a comment; newest stays on top", async ({ page }) => {
    const modal = await openTask(page, 1);
    const comments = modal.getByTestId("comment");
    await expect(comments).toHaveCount(1);

    const composer = modal.getByTestId("comment-composer")
      .locator("[contenteditable='true']");
    await composer.click();
    await page.keyboard.type("A fresh comment");
    await page.keyboard.press("Enter");

    await expect(comments).toHaveCount(2);
    await expect(comments.first()).toContainText("A fresh comment");
    await expect(comments.nth(1)).toContainText("Comment 1");
    await expect(composer).not.toContainText("A fresh comment");

    // Edit
    await comments.first().getByRole("button", { name: "Edit comment" })
      .click();
    const editor = comments.first().locator("[contenteditable='true']");
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("Edited comment");
    await comments.first().getByRole("button", { name: "Save" }).click();
    await expect(comments.first()).toContainText("Edited comment");
    await expect(comments.first()).toContainText("(edited)");

    // Persists across reload
    await page.reload();
    await expect(comments.first()).toContainText("Edited comment");

    // Delete
    await comments.first().getByRole("button", { name: "Delete comment" })
      .click();
    await comments.first().getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(comments).toHaveCount(1);
    await expect(comments.first()).toContainText("Comment 1");
  });

  test("Enter posts a comment; Shift+Enter adds a new line", async ({ page }) => {
    const modal = await openTask(page, 1);
    const comments = modal.getByTestId("comment");
    await expect(comments).toHaveCount(1);

    const composer = modal.getByTestId("comment-composer")
      .locator("[contenteditable='true']");
    await composer.click();
    await page.keyboard.type("line one");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("line two");
    await expect(comments).toHaveCount(1);
    await page.keyboard.press("Enter");

    await expect(comments).toHaveCount(2);
    await expect(comments.first()).toContainText("line one");
    await expect(comments.first()).toContainText("line two");
    await expect(composer).not.toContainText("line one");
  });

  test("desktop: 30% sidebar with the composer pinned while the list scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const modal = await openTask(page, 12);
    const box = await modal.locator(".modal-box").boundingBox();
    const aside = await modal.getByTestId("task-comments").boundingBox();
    const ratio = aside!.width / box!.width;
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.35);
    // Sidebar sits to the right of the form
    expect(aside!.x).toBeGreaterThan(box!.x + box!.width / 2);

    const list = modal.getByTestId("comment-list");
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight))
      .toBe(true);
    await expect(modal.getByTestId("comment-composer")).toBeInViewport();
  });

  test("mobile: comments follow the form and show at most 3 before scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const modal = await openTask(page, 4);
    const list = modal.getByTestId("comment-list");
    const comments = modal.getByTestId("comment");
    await expect(comments).toHaveCount(4);

    // Below the form's Save button
    const save = await modal.getByRole("button", { name: "Save" }).first()
      .boundingBox();
    const aside = await modal.getByTestId("task-comments").boundingBox();
    expect(aside!.y).toBeGreaterThan(save!.y);

    // The list ends exactly at the 3rd comment's bottom edge (polled: the
    // cap is re-measured as the Luthor editors finish laying out).
    await expect.poll(async () => {
      const listBox = await list.boundingBox();
      const third = await comments.nth(2).boundingBox();
      return Math.abs(
        listBox!.y + listBox!.height - (third!.y + third!.height),
      );
    }).toBeLessThan(1);
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight))
      .toBe(true);
  });
});
