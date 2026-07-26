import type { Page } from "@playwright/test";
import {
  expect,
  fillControlled,
  gotoAndWaitForClerk,
  testAuthed as test,
  testNoClerk,
} from "./fixtures.ts";

// The homepage hero form (HeroStartForm.tsx) generates tasks via
// /api/generate-tasks — which calls Google GenAI and needs GOOGLE_AI_STUDIO_KEY
// — so every test mocks that route and never hits the real model.
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

const DASHBOARD_READY = "html[data-board-loaded='true']";

const heroInput = (page: Page) =>
  page.getByPlaceholder("What do you want to do?");
const getStarted = (page: Page) =>
  page.getByRole("button", { name: "Get Started" });

// The board row whose title is `goal`. Scoping task assertions to this row
// keeps the test resilient to any other rows already on the board (the
// authenticated case runs against a shared account that other specs mutate).
const rowFor = (page: Page, goal: string) =>
  page.locator("[id^='row-section-']").filter({
    has: page.getByRole("heading", { name: goal }),
  });

function mockGenerateTasks(page: Page) {
  return page.route("/api/generate-tasks", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_TASKS_RESPONSE),
    }));
}

testNoClerk.describe("Homepage hero form — anonymous", () => {
  // A fresh Playwright context per test starts with empty localStorage, so the
  // visitor's board starts clean without an addInitScript(localStorage.clear),
  // which would otherwise re-run on the /dashboard redirect and wipe what we
  // just persisted.
  testNoClerk.beforeEach(async ({ page }) => {
    await gotoAndWaitForClerk(page, "/");
  });

  testNoClerk(
    "empty submit does not navigate or call the API",
    async ({ page }) => {
      const apiCall = page
        .waitForRequest("**/api/generate-tasks", { timeout: 1500 })
        .catch(() => null);

      await getStarted(page).click();

      // Native `required` (plus the `if (!goal) return` guard) blocks submission.
      expect(await apiCall).toBeNull();
      expect(new URL(page.url()).pathname).toBe("/");
    },
  );

  testNoClerk(
    "redirects to /dashboard and shows the generated row + tasks",
    async ({ page }) => {
      await mockGenerateTasks(page);
      const goal = "Plan a birthday party";

      await fillControlled(heroInput(page), goal);
      await getStarted(page).click();

      await page.waitForURL("**/dashboard");
      await page.locator(DASHBOARD_READY).waitFor({ state: "attached" });

      const row = rowFor(page, goal);
      await expect(row.getByRole("heading", { name: goal })).toBeVisible();
      await expect(
        row.getByRole("heading", { name: "Prepare pizza dough" }),
      ).toBeVisible();
      await expect(
        row.getByRole("heading", { name: "Slice and serve" }),
      ).toBeVisible();

      // The merged board was persisted to localStorage before the redirect.
      const stored = await page.evaluate(() =>
        localStorage.getItem("kanby-v0-1-0")
      );
      expect(stored).toContain(goal);
    },
  );

  testNoClerk(
    "disables the button and shows the generating alert while awaiting the API",
    async ({ page }) => {
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

      await fillControlled(heroInput(page), "Plan a birthday party");

      const requestPromise = page.waitForRequest("**/api/generate-tasks");
      await getStarted(page).click();
      await requestPromise;

      await expect(getStarted(page)).toBeDisabled();
      // Scope to the status text: the homepage's "still in development" notice
      // also carries the .alert-info class, so a bare .alert-info is ambiguous.
      await expect(page.getByText("Generating tasks...")).toBeVisible();

      resolveRoute();
    },
  );
});

test.describe("Homepage hero form — authenticated", () => {
  // Mutates the shared Clerk test account's KV board, so run on one browser
  // project to avoid concurrent runs racing over the same board.
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "shares one Clerk test account across runs",
    );
    // testAuthed boots with global.setup.ts's storage state, so the session is
    // already live — no clerk.signIn() round-trip needed here.
    await page.goto("/dashboard");
    const cleared = await page.request.get("/api/delete-test-data");
    expect(cleared.status()).toBe(200);
    await mockGenerateTasks(page);
  });

  test.afterEach(async ({ page }) => {
    const cleared = await page.request.get("/api/delete-test-data");
    expect(cleared.status()).toBe(200);
  });

  test(
    "redirects to /dashboard and persists the row + tasks to the account",
    async ({ page }) => {
      const goal = `E2E Goal ${crypto.randomUUID()}`;
      await page.goto("/");

      await fillControlled(heroInput(page), goal);

      const genRequest = page.waitForRequest("**/api/generate-tasks");
      const putRequest = page.waitForRequest(
        (r) => r.url().includes("/api/board") && r.method() === "PUT",
      );
      await getStarted(page).click();
      await genRequest;
      const put = await putRequest;

      await page.waitForURL("**/dashboard");

      // Assert persistence on the PUT payload itself rather than re-reading it
      // through the live, autosaving dashboard: this account is shared across
      // specs, so a dashboard round-trip would race with a stale autosave.
      const body = put.postDataJSON();
      expect(body.rows.some((r: { title: string }) => r.title === goal)).toBe(
        true,
      );
      expect(
        body.tasks.some((t: { title: string }) =>
          t.title === "Prepare pizza dough"
        ),
      ).toBe(true);
    },
  );
});
