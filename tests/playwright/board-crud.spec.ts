/// <reference lib="dom" />
import { expect, fillStable, testNoClerk as test } from "./fixtures.ts";

/**
 * Seeded board state, written to localStorage before navigation so every
 * test starts from the same known rows/columns/tasks (same shape as the
 * BOARD/LOAD payload — see src/components/context/reducers/board.ts).
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
    { id: "col-e2e-3", title: "Done", order: "a2" },
  ],
  tasks: [
    {
      id: "task-e2e-1",
      rowId: "row-e2e-1",
      colId: "col-e2e-1",
      title: "Write specs",
      description: "",
      checklist: [{ id: "item-e2e-1", text: "Draft outline", checked: false }],
      order: "a0",
    },
    {
      id: "task-e2e-2",
      rowId: "row-e2e-1",
      colId: "col-e2e-1",
      title: "Drag me",
      description: "",
      checklist: [],
      order: "a1",
    },
  ],
};

test.describe("Board CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, BOARD_STATE);
    await page.goto("/");
    await expect(page.locator("#row-section-row-e2e-1")).toBeVisible();
    await page.locator("#board-config-collapse-toggle").click();
    // Wait for the collapse to expand before tests interact with its contents.
    await expect(page.locator("#board-config-column-settings")).toBeVisible();
  });

  test.describe("column management", () => {
    test("adds a new default column to every row", async ({ page }) => {
      const columnSettings = page.locator("#board-config-column-settings");
      const input = columnSettings.getByPlaceholder("Add new column");
      // The Enter handler reads the column title from React state, so commit the
      // value (retrying if an early re-render clobbers it) before the keypress.
      await fillStable(input, "Backlog");
      await input.press("Enter");

      await expect(columnSettings.getByText("Backlog", { exact: true }))
        .toBeVisible();
      await expect(
        page.locator("#row-columns-row-e2e-1").getByText("Backlog", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.locator("#row-columns-row-e2e-2").getByText("Backlog", {
          exact: true,
        }),
      ).toBeVisible();
    });

    test("deletes a default column from every row", async ({ page }) => {
      const columnSettings = page.locator("#board-config-column-settings");
      const doneBadge = columnSettings.locator(".join", { hasText: "Done" });
      await doneBadge.locator("button:has(.basil--cross-outline)").click();

      await expect(columnSettings.getByText("Done", { exact: true }))
        .toHaveCount(0);
      await expect(
        page.locator("#row-columns-row-e2e-1").getByText("Done", {
          exact: true,
        }),
      ).toHaveCount(0);
    });

    test("renames a column inline and reflects the change everywhere", async ({ page }) => {
      const todoHeading = page.locator("#row-columns-row-e2e-1").getByText(
        "To Do",
        { exact: true },
      );
      await todoHeading.dblclick();

      const input = page.locator("#row-columns-row-e2e-1 input[type='text']");
      await input.fill("Backlog");
      await input.press("Enter");

      await expect(
        page.locator("#row-columns-row-e2e-1").getByText("Backlog", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.locator("#row-columns-row-e2e-2").getByText("Backlog", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.locator("#board-config-column-settings").getByText("Backlog", {
          exact: true,
        }),
      ).toBeVisible();
    });
  });

  test.describe("row management", () => {
    test("renames a row title inline from the row header", async ({ page }) => {
      await page.locator("#row-section-row-e2e-1").getByText("Engineering", {
        exact: true,
      }).dblclick();

      const input = page.locator("#row-section-row-e2e-1 input[type='text']");
      await input.fill("Eng Team");
      await input.press("Enter");

      await expect(
        page.locator("#row-section-row-e2e-1").getByText("Eng Team", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.locator("#board-config-row-display-settings").getByText(
          "Eng Team",
          { exact: true },
        ),
      ).toBeVisible();
    });

    test("renames a row title inline from board configuration", async ({ page }) => {
      const rowSettings = page.locator("#board-config-row-display-settings");
      await rowSettings.getByText("Marketing", { exact: true }).dblclick();

      const input = rowSettings.locator("input[type='text']");
      await input.fill("Mktg");
      await input.press("Enter");

      await expect(rowSettings.getByText("Mktg", { exact: true }))
        .toBeVisible();
      await expect(
        page.locator("#row-section-row-e2e-2").getByText("Mktg", {
          exact: true,
        }),
      ).toBeVisible();
    });

    test("updates a row's color", async ({ page }) => {
      const rowSettings = page.locator("#board-config-row-display-settings");
      const engineeringRow = rowSettings.locator("li", {
        hasText: "Engineering",
      });
      await engineeringRow.locator("select").selectOption({ label: "Green" });

      await expect(page.locator("#row-section-row-e2e-1")).toHaveAttribute(
        "style",
        /--color-row-green/,
      );
    });

    test("moves a row down and back up", async ({ page }) => {
      const rowSettings = page.locator("#board-config-row-display-settings");
      const sections = page.locator("[id^='row-section-']");

      await rowSettings.getByRole("button", { name: "Move Engineering down" })
        .click();
      await expect(sections.first()).toHaveAttribute(
        "id",
        "row-section-row-e2e-2",
      );
      await expect(sections.nth(1)).toHaveAttribute(
        "id",
        "row-section-row-e2e-1",
      );

      await rowSettings.getByRole("button", { name: "Move Engineering up" })
        .click();
      await expect(sections.first()).toHaveAttribute(
        "id",
        "row-section-row-e2e-1",
      );
    });

    test("deletes a row after confirming", async ({ page }) => {
      page.on("dialog", (dialog) => dialog.accept());

      await page.locator("#row-section-row-e2e-1").getByRole("button", {
        name: "Delete project Engineering",
      }).click();

      await expect(page.locator("#row-section-row-e2e-1")).toHaveCount(0);
      await expect(
        page.locator("#board-config-row-display-settings").getByText(
          "Engineering",
          { exact: true },
        ),
      ).toHaveCount(0);
    });
  });

  test.describe("task editing", () => {
    test("edits a task's title, status, and row, then saves", async ({ page }) => {
      await page.locator("#row-columns-row-e2e-1").getByText("Write specs", {
        exact: true,
      }).click();
      await expect(page.getByRole("heading", { name: "Edit task" }))
        .toBeVisible();
      await expect(page).toHaveURL(/\/task\/task-e2e-1/);

      await fillStable(
        page.getByRole("group", { name: "Title" }).getByRole("textbox"),
        "Write detailed specs",
      );
      await page.locator("#edit-column-select-task-e2e-1").selectOption(
        "col-e2e-2",
      );
      await page.locator("#edit-row-select-task-e2e-1").selectOption(
        "row-e2e-2",
      );
      await page.locator("dialog").getByRole("button", { name: "Save" })
        .click();

      await expect(page.getByRole("heading", { name: "Edit task" }))
        .toBeHidden();
      await expect(page).toHaveURL("/");
      const targetColumn = page.locator("#row-columns-row-e2e-2 > div > div")
        .nth(1);
      await expect(
        targetColumn.getByText("Write detailed specs", { exact: true }),
      ).toBeVisible();
    });

    test("deletes a task from the edit modal", async ({ page }) => {
      await page.locator("#row-columns-row-e2e-1").getByText("Drag me", {
        exact: true,
      }).click();
      await expect(page.getByRole("heading", { name: "Edit task" }))
        .toBeVisible();

      await page.locator("dialog").getByRole("button", {
        name: "Delete",
        exact: true,
      }).click();

      await expect(page).toHaveURL("/");
      await expect(page.getByText("Drag me", { exact: true })).toHaveCount(0);
    });
  });

  test.describe("checklist", () => {
    test("toggles a checklist item on a task card", async ({ page }) => {
      const taskCard = page.locator("article#task-e2e-1");
      const item = taskCard.locator("label", { hasText: "Draft outline" });

      await item.locator("input[type='checkbox']").click();

      await expect(item.locator("input[type='checkbox']")).toBeChecked();
      await expect(item.locator("span")).toHaveClass(/line-through/);
    });

    test("appends new checklist items after the last one (button + Shift+Enter)", async ({ page }) => {
      // Open the edit modal for task-e2e-1, seeded with one item: "Draft outline".
      await page.locator("article#task-e2e-1").getByText("Write specs").click();
      const modal = page.locator("dialog.modal-open");
      await expect(modal.getByText("Edit task")).toBeVisible();

      const fields = modal.getByPlaceholder("Shift+Enter to add more");
      await expect(fields).toHaveCount(1);
      await expect(fields.nth(0)).toHaveValue("Draft outline");

      // Button add must append to the END, not unshift to the front.
      await modal.locator("button[data-tip='Add checklist item']").click();
      await expect(fields).toHaveCount(2);
      await fillStable(fields.nth(1), "Second item");
      await expect(fields.nth(0)).toHaveValue("Draft outline");
      await expect(fields.nth(1)).toHaveValue("Second item");

      // Shift+Enter from the last input also appends directly after it.
      await fields.nth(1).press("Shift+Enter");
      await expect(fields).toHaveCount(3);
      await fillStable(fields.nth(2), "Third item");
      await expect(fields.nth(0)).toHaveValue("Draft outline");
      await expect(fields.nth(1)).toHaveValue("Second item");
      await expect(fields.nth(2)).toHaveValue("Third item");
    });
  });

  test.describe("drag and drop", () => {
    test("moves a task to a different column via drag and drop", async ({ page }) => {
      const todoColumn = page.locator("#row-columns-row-e2e-1 > div > div")
        .nth(0);
      const inProgressColumn = page.locator(
        "#row-columns-row-e2e-1 > div > div",
      ).nth(1);

      // Real OS-level drag gestures aren't reliable across browsers in CI, so
      // dispatch the HTML5 drag-and-drop events the app's handlers listen for
      // directly (mirrors what a native drag-and-drop produces). dragstart is
      // fired in its own round trip so React can flush the resulting state
      // update (draggedTask) before drop is handled.
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

      await page.evaluate((dataTransfer) => {
        const source = document.querySelector("article#task-e2e-2")!;
        source.dispatchEvent(
          new DragEvent("dragstart", {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          }),
        );
      }, dataTransfer);

      await page.evaluate((dataTransfer) => {
        const source = document.querySelector("article#task-e2e-2")!;
        const target = document.querySelector(
          "#row-columns-row-e2e-1 > div > div:nth-child(2)",
        )!;
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
        fire(source, "dragend");
      }, dataTransfer);

      await expect(inProgressColumn.locator("article#task-e2e-2"))
        .toBeVisible();
      await expect(todoColumn.locator("article#task-e2e-2")).toHaveCount(0);
      await expect(todoColumn.locator("article#task-e2e-1")).toBeVisible();
    });

    test("reorders a task within the same column via drag and drop", async ({ page }) => {
      const todoColumn = page.locator("#row-columns-row-e2e-1 > div > div")
        .nth(0);
      const cards = todoColumn.locator("article");

      // Seeded order in To Do: task-e2e-1 (a0) then task-e2e-2 (a1).
      await expect(cards.nth(0)).toHaveAttribute("id", "task-e2e-1");
      await expect(cards.nth(1)).toHaveAttribute("id", "task-e2e-2");

      // Drag task-e2e-2 onto task-e2e-1 to move it before. Each phase runs in
      // its own round trip so React flushes draggedTask, then dropTarget,
      // before drop is handled (a same-cell reorder reads dropTarget).
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

      await page.evaluate((dataTransfer) => {
        document.querySelector("article#task-e2e-2")!.dispatchEvent(
          new DragEvent("dragstart", {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          }),
        );
      }, dataTransfer);

      await page.evaluate((dataTransfer) => {
        document.querySelector("article#task-e2e-1")!.dispatchEvent(
          new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          }),
        );
      }, dataTransfer);

      await page.evaluate((dataTransfer) => {
        const fire = (sel: string, type: string) =>
          document.querySelector(sel)!.dispatchEvent(
            new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              dataTransfer,
            }),
          );
        fire("article#task-e2e-1", "drop");
        fire("article#task-e2e-2", "dragend");
      }, dataTransfer);

      // Order is now swapped: task-e2e-2 before task-e2e-1, both still in To Do.
      await expect(cards.nth(0)).toHaveAttribute("id", "task-e2e-2");
      await expect(cards.nth(1)).toHaveAttribute("id", "task-e2e-1");
    });

    test("reorders checklist items in the edit modal via drag and drop", async ({ page }) => {
      // Open the edit modal (task-e2e-1 seeded with one item: "Draft outline")
      // and add a second item so there are two to reorder.
      await page.locator("article#task-e2e-1").getByText("Write specs").click();
      const modal = page.locator("dialog.modal-open");
      await expect(modal.getByText("Edit task")).toBeVisible();

      const fields = modal.getByPlaceholder("Shift+Enter to add more");
      await modal.locator("button[data-tip='Add checklist item']").click();
      await fillStable(fields.nth(1), "Second item");
      await expect(fields.nth(0)).toHaveValue("Draft outline");
      await expect(fields.nth(1)).toHaveValue("Second item");

      // Drag the second item's handle onto the first to move it before. Each
      // HTML5 drag phase is fired in its own round trip so React can flush the
      // resulting state (draggedId, then dropTarget) before drop is handled.
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

      await page.evaluate((dataTransfer) => {
        const rows = document.querySelectorAll(
          "dialog.modal-open [data-checklist-item]",
        );
        rows[1].querySelector("[aria-label='Drag to reorder']")!
          .dispatchEvent(
            new DragEvent("dragstart", {
              bubbles: true,
              cancelable: true,
              dataTransfer,
            }),
          );
      }, dataTransfer);

      await page.evaluate((dataTransfer) => {
        const rows = document.querySelectorAll(
          "dialog.modal-open [data-checklist-item]",
        );
        rows[0].dispatchEvent(
          new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          }),
        );
      }, dataTransfer);

      await page.evaluate((dataTransfer) => {
        const rows = document.querySelectorAll(
          "dialog.modal-open [data-checklist-item]",
        );
        const fire = (el: Element, type: string) =>
          el.dispatchEvent(
            new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              dataTransfer,
            }),
          );
        fire(rows[0], "drop");
        fire(
          rows[1].querySelector("[aria-label='Drag to reorder']")!,
          "dragend",
        );
      }, dataTransfer);

      await expect(fields.nth(0)).toHaveValue("Second item");
      await expect(fields.nth(1)).toHaveValue("Draft outline");
    });
  });
});
