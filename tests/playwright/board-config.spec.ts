import {
  expect,
  fillStable,
  openCreateRowModal,
  testNoClerk as test,
} from "./fixtures.ts";

const MOCK_TASKS_RESPONSE = {
  response: [
    "Prepare pizza dough",
    "Prepare pizza sauce",
    "Grate mozzarella cheese",
    "Slice toppings",
    "Roll out dough",
    "Spread sauce on crust",
    "Add cheese and toppings",
    "Preheat oven",
    "Bake pizza",
    "Slice and serve",
  ],
};

/**
 * CreateRowModal.tsx — [data-testid='create-new-row'] section (opened from the
 * board "+" menu via "Add new project row", no longer the gear/config modal).
 * Contains a form with:
 *   - Row name input (required, no id, identified by placeholder)
 *   - AI prompt input (#newRowPrompt, optional)
 *   - "Add Row" submit button (hidden while isGeneratingTasks)
 *   - .alert-info status block (visible only while isGeneratingTasks)
 *
 * The form calls addRow() on submit, which dispatches ROW/ADD and optionally
 * fetches /api/generate-tasks when a prompt is provided.
 * After completion, ROW/RESET_FORM resets state (newRowFormKey changes,
 * unmounting/remounting the form to clear inputs).
 */
// A dashboard with no rows renders CreateRowSection inline (empty state), which
// would duplicate the modal's copy. Seed one row so only the modal form renders.
const SEED_BOARD = {
  rows: [
    {
      id: "row-seed",
      title: "Seed Project",
      color: "var(--color-row-blue)",
      order: "a0",
    },
  ],
  columns: [
    { id: "col-todo", title: "To Do", order: "a0" },
    { id: "col-prog", title: "In Progress", order: "a1" },
    { id: "col-done", title: "Done", order: "a2" },
  ],
  tasks: [],
};

test.describe("Board Configuration — Create New Row section", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, SEED_BOARD);
    await page.goto("/dashboard");
    await openCreateRowModal(page);
  });

  test.describe("form visibility", () => {
    test("shows heading, row name input, AI prompt input, and Add Row button", async ({ page }) => {
      const section = page.locator("[data-testid='create-new-row']");
      await expect(section.getByText("Create a new row")).toBeVisible();
      await expect(
        section.getByPlaceholder(
          "A project name, a category for large project tasks, etc.",
        ),
      ).toBeVisible();
      await expect(section.locator("#newRowPrompt")).toBeVisible();
      await expect(section.getByRole("button", { name: "Add Row" }))
        .toBeVisible();
    });

    test("does not show the status alert by default", async ({ page }) => {
      await expect(
        page.locator("[data-testid='create-new-row'] .alert-info"),
      ).not.toBeVisible();
    });
  });

  test.describe("creating a row without AI", () => {
    test("does not add a row when row name is empty", async ({ page }) => {
      const rowSettings = page.locator("#board-config-row-display-settings");
      const before = await rowSettings.locator("li").count();

      await page.locator("[data-testid='create-new-row']").getByRole("button", {
        name: "Add Row",
      }).click();

      // Native form validation blocks submission — row count is unchanged
      await expect(rowSettings.locator("li")).toHaveCount(before);
    });

    test("adds the new row to row settings when only a name is provided", async ({ page }) => {
      const section = page.locator("[data-testid='create-new-row']");
      const nameInput = section.getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      );
      await fillStable(nameInput, "My New Row");
      await section.getByRole("button", { name: "Add Row" }).click();

      // The row-settings list lives in the (closed) gear modal, so verify the
      // new row appears on the board itself instead.
      await expect(
        page.getByRole("heading", { name: "My New Row" }),
      ).toBeVisible();
    });

    test("resets the row name field after the row is added", async ({ page }) => {
      const section = page.locator("[data-testid='create-new-row']");
      const rowNameInput = section.getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      );
      await fillStable(rowNameInput, "My New Row");
      await section.getByRole("button", { name: "Add Row" }).click();

      await expect(rowNameInput).toHaveValue("");
    });
  });

  test.describe("creating a row with AI task generation (mocked /api/generate-tasks)", () => {
    test("hides Add Row button and shows generating status while waiting for the API", async ({ page }) => {
      let resolveRoute!: () => void;
      await page.route(
        "/api/generate-tasks",
        (route) =>
          new Promise<void>((resolve) => {
            resolveRoute = resolve;
          }).then(() =>
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(MOCK_TASKS_RESPONSE),
            })
          ),
      );

      const section = page.locator("[data-testid='create-new-row']");
      const nameInput = section.getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      );
      const promptInput = section.locator("#newRowPrompt");
      // addRow reads the name/prompt from React state, so commit both inputs
      // (retrying if an early re-render clobbers them) before submitting.
      await fillStable(nameInput, "Pizza Making");
      await fillStable(promptInput, "Steps to make a pizza");

      const requestPromise = page.waitForRequest("**/api/generate-tasks");
      await section.getByRole("button", { name: "Add Row" }).click();
      await requestPromise;

      await expect(section.getByRole("button", { name: "Add Row" })).not
        .toBeVisible();
      await expect(section.locator(".alert-info")).toBeVisible();
      await expect(section.locator(".alert-info")).toContainText(
        "Generating tasks",
      );

      resolveRoute();
    });

    test("adds the new row to the board after AI generation completes", async ({ page }) => {
      await page.route("/api/generate-tasks", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TASKS_RESPONSE),
        }));

      const section = page.locator("[data-testid='create-new-row']");
      const nameInput = section.getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      );
      const promptInput = section.locator("#newRowPrompt");
      await fillStable(nameInput, "Pizza Making");
      await fillStable(promptInput, "Steps to make a pizza");
      await section.getByRole("button", { name: "Add Row" }).click();

      // Row-settings list is in the closed gear modal — verify on the board.
      await expect(
        page.getByRole("heading", { name: "Pizza Making" }),
      ).toBeVisible();
    });

    test("places generated tasks on the board after AI generation completes", async ({ page }) => {
      await page.route("/api/generate-tasks", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TASKS_RESPONSE),
        }));

      const section = page.locator("[data-testid='create-new-row']");
      const nameInput = section.getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      );
      const promptInput = section.locator("#newRowPrompt");
      await fillStable(nameInput, "Pizza Making");
      await fillStable(promptInput, "Steps to make a pizza");
      await section.getByRole("button", { name: "Add Row" }).click();

      // Target the board task-card headings — task titles also appear (as
      // <span>s) in ColumnSettingsSection's column-deletion preview, which is
      // always mounted, so a bare getByText would be ambiguous.
      await expect(
        page.getByRole("heading", { name: "Prepare pizza dough" }),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole("heading", { name: "Bake pizza" }),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole("heading", { name: "Slice and serve" }),
      ).toBeVisible({ timeout: 10000 });
    });

    test("restores Add Row button after AI generation completes", async ({ page }) => {
      await page.route("/api/generate-tasks", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TASKS_RESPONSE),
        }));

      const section = page.locator("[data-testid='create-new-row']");
      const nameInput = section.getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      );
      const promptInput = section.locator("#newRowPrompt");
      await fillStable(nameInput, "Pizza Making");
      await fillStable(promptInput, "Steps to make a pizza");
      await section.getByRole("button", { name: "Add Row" }).click();

      await expect(
        section.getByRole("button", { name: "Add Row" }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("resets the form fields after AI generation completes", async ({ page }) => {
      await page.route("/api/generate-tasks", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TASKS_RESPONSE),
        }));

      const section = page.locator("[data-testid='create-new-row']");
      const rowNameInput = section.getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      );
      const promptInput = section.locator("#newRowPrompt");

      await fillStable(rowNameInput, "Pizza Making");
      await fillStable(promptInput, "Steps to make a pizza");
      await section.getByRole("button", { name: "Add Row" }).click();

      await expect(section.getByRole("button", { name: "Add Row" }))
        .toBeVisible({ timeout: 5000 });
      await expect(rowNameInput).toHaveValue("");
      await expect(promptInput).toHaveValue("");
    });
  });
});
