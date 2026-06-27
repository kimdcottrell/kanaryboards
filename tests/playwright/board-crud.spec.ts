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
    {
      id: "col-e2e-1",
      title: "To Do",
      order: "a0",
      pinned: false,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
    {
      id: "col-e2e-2",
      title: "In Progress",
      order: "a1",
      pinned: false,
      icon: "tick-01",
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
    {
      id: "col-e2e-3",
      title: "Done",
      order: "a2",
      pinned: false,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
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
    await page.goto("/dashboard");
    await expect(page.locator("#row-section-row-e2e-1")).toBeVisible();
  });

  // The board configuration modal sits on top of the board (with a backdrop
  // that intercepts pointer events on the row/column/task elements behind
  // it), so it must be closed before interacting with the board, and can be
  // reopened afterward if a test needs to read its content again.
  async function openBoardConfigModal(page: import("@playwright/test").Page) {
    await page.locator("#board-config-collapse-toggle").click();
  }
  async function closeBoardConfigModal(page: import("@playwright/test").Page) {
    // Both the close button and the backdrop sit under elements with a
    // higher stacking context (e.g. the fixed navbar) in places Playwright's
    // hit-testing considers the click target, so dispatch the backdrop's
    // click handler directly instead of simulating a real pointer click.
    await page.evaluate(() => {
      document.querySelector("dialog.modal-open .modal-backdrop")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    // Wait for the modal to actually close so its backdrop no longer intercepts
    // pointer events on the board behind it before the test interacts with it.
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);
  }

  test.describe("column management", () => {
    test.beforeEach(async ({ page }) => {
      await openBoardConfigModal(page);
      await expect(page.locator("#board-config-column-settings"))
        .toBeVisible();
    });
    test("adds a new column via the create-column form", async ({ page }) => {
      const columnSettings = page.locator("#board-config-column-settings");
      const createColumn = page.locator("#create-new-column");

      // The submit handler reads the name from React state, so commit the value
      // (retrying if an early re-render clobbers it) before submitting.
      await fillStable(createColumn.locator("input[type='text']"), "Backlog");
      // Place "Backlog" to the right of "Done"; the two selects are direction
      // then reference column.
      const selects = createColumn.locator("select");
      await selects.nth(0).selectOption({ label: "Right" });
      await selects.nth(1).selectOption({ label: "Done" });
      await createColumn.getByRole("button", { name: "Add Column" }).click();

      // Scope to the column card's heading — "Backlog" also appears as an
      // <option> in the "Of column" select.
      await expect(
        columnSettings.locator("div[draggable='true']").filter({
          has: page.getByRole("heading", { name: "Backlog", exact: true }),
        }),
      ).toBeVisible();
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

    test("deletes a column and its tasks from the config", async ({ page }) => {
      const columnSettings = page.locator("#board-config-column-settings");
      // Filter by the card heading, not text: every card's body contains
      // "...undone", which a case-insensitive hasText:"Done" would match.
      const doneCard = columnSettings.locator("div[draggable='true']").filter({
        has: page.getByRole("heading", { name: "Done", exact: true }),
      });
      // Expand the card's "Delete the column" disclosure, then destroy it.
      await doneCard.locator("summary").click();
      await doneCard.getByRole("button", {
        name: "Destroy column and all tasks",
      }).click();

      await expect(columnSettings.getByText("Done", { exact: true }))
        .toHaveCount(0);
      await expect(
        page.locator("#row-columns-row-e2e-1").getByText("Done", {
          exact: true,
        }),
      ).toHaveCount(0);
    });

    test("renames a column inline and reflects the change everywhere", async ({ page }) => {
      await closeBoardConfigModal(page);
      // Double-click the column header itself (the <h4> carries the handler; its
      // title sits in a child <span>, so target the heading, not the text node).
      const todoHeading = page.locator("#row-columns-row-e2e-1 h4").filter({
        hasText: "To Do",
      });
      const input = page.locator("#row-columns-row-e2e-1 input[type='text']");
      // The first double-click right after the config modal closes can be
      // dropped while React settles the close re-render, so retry the
      // double-click until inline edit mode actually engages.
      await expect(async () => {
        await todoHeading.dblclick();
        await expect(input).toBeVisible({ timeout: 1000 });
      }).toPass();
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

      await openBoardConfigModal(page);
      // Scope to the column card heading — "Backlog" also appears as an
      // <option> in the "Of column" select.
      await expect(
        page.locator("#board-config-column-settings div[draggable='true']")
          .filter({
            has: page.getByRole("heading", { name: "Backlog", exact: true }),
          }),
      ).toBeVisible();
    });

    test("reordering a column card updates drag visuals and order", async ({ page }) => {
      const columnSettings = page.locator("#board-config-column-settings");
      const badges = columnSettings.locator("div[draggable='true']");

      // Seeded order: To Do (0), In Progress (1), Done (2).
      await expect(badges.nth(0)).toContainText("To Do");
      await expect(badges.nth(1)).toContainText("In Progress");
      await expect(badges.nth(2)).toContainText("Done");

      // Drag "To Do" onto "Done". Each phase runs in its own round trip so React
      // flushes draggedDefaultIndex / dragHoverIndex before the next event fires.
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

      await page.evaluate((dataTransfer) => {
        const badges = document.querySelectorAll(
          "#board-config-column-settings div[draggable='true']",
        );
        badges[0].dispatchEvent(
          new DragEvent("dragstart", {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          }),
        );
      }, dataTransfer);

      // The dragged badge fades to 0.4 opacity while draggedDefaultIndex === 0.
      await expect(badges.nth(0)).toHaveCSS("opacity", "0.4");

      await page.evaluate((dataTransfer) => {
        const badges = document.querySelectorAll(
          "#board-config-column-settings div[draggable='true']",
        );
        badges[2].dispatchEvent(
          new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          }),
        );
      }, dataTransfer);

      // Hovering "Done" while "To Do" is dragged shows a drop indicator on it.
      await expect(badges.nth(2).locator("span.bg-accent")).toBeVisible();

      await page.evaluate((dataTransfer) => {
        const badges = document.querySelectorAll(
          "#board-config-column-settings div[draggable='true']",
        );
        const fire = (el: Element, type: string) =>
          el.dispatchEvent(
            new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              dataTransfer,
            }),
          );
        fire(badges[2], "drop");
        fire(badges[0], "dragend");
      }, dataTransfer);

      // Dropping onto the last column ("Done") places "To Do" after it, so the
      // order becomes In Progress, Done, To Do.
      await expect(badges.nth(0)).toContainText("In Progress");
      await expect(badges.nth(1)).toContainText("Done");
      await expect(badges.nth(2)).toContainText("To Do");

      // Drag visuals reset once dragging ends.
      await expect(badges.nth(2)).toHaveCSS("opacity", "1");
      await expect(columnSettings.locator("span.bg-accent")).toHaveCount(0);
    });

    test("pins a column to the board shortcut menu", async ({ page }) => {
      const columnSettings = page.locator("#board-config-column-settings");
      const inProgressCard = columnSettings.locator("div[draggable='true']")
        .filter({
          has: page.getByRole("heading", { name: "In Progress", exact: true }),
        });
      // The shortcut-menu link wraps the title plus a task-count badge, so match
      // the link by substring rather than an exact text node.
      const menuLink = page.locator("#board-menu a").filter({
        hasText: "In Progress",
      });

      // Seeded columns start unpinned and absent from the shortcut menu.
      await expect(menuLink).toHaveCount(0);

      await inProgressCard.getByRole("button", {
        name: "Pin column to board menu",
      }).click();

      // The pin toggles to an unpin control and the column joins the menu.
      await expect(
        inProgressCard.getByRole("button", {
          name: "Unpin column from board menu",
        }),
      ).toBeVisible();
      await expect(menuLink).toBeVisible();
    });

    test("toggles displaying a column icon", async ({ page }) => {
      const columnSettings = page.locator("#board-config-column-settings");
      const inProgressCard = columnSettings.locator("div[draggable='true']")
        .filter({
          has: page.getByRole("heading", { name: "In Progress", exact: true }),
        });
      // col-e2e-2 is seeded with an icon but iconNearColumnTitle: false, so the
      // icon stays hidden until the checkbox is enabled.
      const checkbox = inProgressCard.locator("label", {
        hasText: "Display icon near column title",
      }).locator("input[type='checkbox']");

      await expect(checkbox).not.toBeChecked();
      const inProgressHeader = page.locator("#row-columns-row-e2e-1 h4").filter(
        {
          hasText: "In Progress",
        },
      );
      await expect(inProgressHeader.locator("svg")).toHaveCount(0);

      await checkbox.click();

      await expect(checkbox).toBeChecked();
      // DynamicIcon resolves the hugeicon asynchronously; Playwright auto-waits
      // for the rendered <svg> to appear next to the column title.
      await expect(inProgressHeader.locator("svg")).toBeVisible();
    });
  });

  test.describe("row management", () => {
    test.beforeEach(async ({ page }) => {
      await openBoardConfigModal(page);
      await expect(page.locator("#board-config-row-display-settings"))
        .toBeVisible();
    });

    test("renames a row title inline from the row header", async ({ page }) => {
      await closeBoardConfigModal(page);
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

      await openBoardConfigModal(page);
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
      await closeBoardConfigModal(page);

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
      await expect(page).toHaveURL(/\/dashboard\/task\/task-e2e-1/);

      await fillStable(
        page.getByRole("textbox", { name: "Title" }),
        "Write detailed specs",
      );
      await page.locator("#column-select-task-e2e-1").selectOption(
        "col-e2e-2",
      );
      await page.locator("#row-select-task-e2e-1").selectOption(
        "row-e2e-2",
      );
      await page.locator("dialog").getByRole("button", { name: "Save" })
        .click();

      await expect(page.getByRole("heading", { name: "Edit task" }))
        .toBeHidden();
      await expect(page).toHaveURL("/dashboard");
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

      await expect(page).toHaveURL("/dashboard");
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

    test("moves a task to a different row via drag and drop", async ({ page }) => {
      const todoColumnRow1 = page.locator("#row-columns-row-e2e-1 > div > div")
        .nth(0);
      const inProgressColumnRow2 = page.locator(
        "#row-columns-row-e2e-2 > div > div",
      ).nth(1);

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
          "#row-columns-row-e2e-2 > div > div:nth-child(2)",
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

      await expect(inProgressColumnRow2.locator("article#task-e2e-2"))
        .toBeVisible();
      await expect(todoColumnRow1.locator("article#task-e2e-2")).toHaveCount(
        0,
      );
      await expect(todoColumnRow1.locator("article#task-e2e-1"))
        .toBeVisible();
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
