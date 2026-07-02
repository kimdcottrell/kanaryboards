import { clerk } from "@clerk/testing/playwright";
import { expect, openCreateRowModal, test } from "./fixtures.ts";

const E2E_EMAIL = process.env.E2E_CLERK_USER_EMAIL ?? "";

test.describe("Board persistence across sign-in", () => {
  test.beforeEach(async ({ page, browserName }) => {
    // This test mutates the shared Clerk test account's board in KV — run it
    // on a single browser project to avoid concurrent runs racing over the
    // same board.
    test.skip(
      browserName !== "chromium",
      "shares one Clerk test account across runs",
    );
    await page.goto("/dashboard");

    // Clear out any board left over from a previous run so sign-in migrates
    // this test's localStorage data instead of loading stale remote data.
    const response = await page.request.get("/api/delete-test-data");
    expect(response.status()).toBe(200);
  });

  test.afterEach(async ({ page }) => {
    // Teardown: delete the test account's board so the next run starts from a clean slate.
    const response = await page.request.get("/api/delete-test-data");
    expect(response.status()).toBe(200);
  });

  test("a row and task created before sign-in are present after sign-in", async ({ page }) => {
    const rowName = `E2E Row ${crypto.randomUUID()}`;
    const taskName = `E2E Task ${crypto.randomUUID()}`;

    // Add a new row via the board "+" menu (CreateRowModal)
    await openCreateRowModal(page);
    const createRow = page.locator("dialog [data-testid='create-new-row']");
    await createRow
      .getByPlaceholder(
        "A project name, a category for large project tasks, etc.",
      )
      .fill(rowName);
    await createRow.getByRole("button", { name: "Add Row" }).click();
    await expect(page.getByRole("heading", { name: rowName })).toBeVisible();

    // Close the create-row modal so its backdrop no longer
    // intercepts pointer events on the board behind it. The close button and
    // backdrop both sit under the fixed navbar in places Playwright's
    // hit-testing considers the click target, so dispatch the backdrop's
    // click handler directly instead of simulating a real pointer click.
    await page.evaluate(() => {
      document.querySelector("dialog.modal-open .modal-backdrop")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Add a task to the new row
    const newRow = page.locator("[id^='row-section-']").last();
    await expect(newRow.getByText(rowName)).toBeVisible();
    await newRow.locator("button:has(.hugeicons--add-01)").first()
      .click();
    await expect(page.getByRole("heading", { name: "Add task" }))
      .toBeVisible();
    await page.getByRole("textbox", { name: "Title" })
      .fill(taskName);
    await page.locator("dialog").getByRole("button", { name: "Create task" })
      .click();
    await expect(newRow.getByText(taskName)).toBeVisible();

    // Wait for the debounced localStorage save (BoardContext persists 500ms
    // after a state change) so sign-in migration picks up this task.
    await page.waitForFunction(
      (name) => localStorage.getItem("kanby-v0-1-0")?.includes(name),
      taskName,
    );

    // Log in. Uses a server-generated sign-in ticket (via the emailAddress
    // param), which bypasses the email_code second factor required by this
    // Clerk instance and resolves once Clerk.user is set.
    await clerk.signIn({ page, emailAddress: E2E_EMAIL });

    await page.goto("/dashboard");

    await expect(page.getByRole("button", { name: "Sign In" })).toBeHidden();

    // Row and task created before sign-in are still present after logging in
    await expect(newRow.getByText(rowName)).toBeVisible();
    await expect(newRow.getByText(taskName)).toBeVisible();
  });
});
