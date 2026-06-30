/// <reference lib="dom" />
import { clerk } from "@clerk/testing/playwright";
import { type Page, type Route } from "@playwright/test";
import { expect, test, testNoClerk } from "./fixtures.ts";

/**
 * Seeded board with enough rows that the last one sits well below the fold, so
 * the "scroll to row" behavior is observable. Same shape/key as the BOARD/LOAD
 * payload (see src/components/context/reducers/board.ts).
 */
const ROW_COLORS = [
  "var(--color-row-blue)",
  "var(--color-row-red)",
  "var(--color-row-yellow)",
  "var(--color-row-green)",
  "var(--color-row-purple)",
  "var(--color-row-grey)",
];

const BOARD_STATE = {
  rows: Array.from({ length: 8 }, (_, i) => ({
    id: `row-e2e-${i + 1}`,
    title: `Project ${i + 1}`,
    color: ROW_COLORS[i % ROW_COLORS.length],
    order: `a${i}`,
  })),
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
      title: "First task",
      description: "",
      checklist: [],
      order: "a0",
    },
    {
      id: "task-e2e-2",
      rowId: "row-e2e-8",
      colId: "col-e2e-1",
      title: "Last task",
      description: "",
      checklist: [],
      order: "a0",
    },
  ],
};

const DASHBOARD_READY = "html[data-board-loaded='true']";

function rowLink(page: Page, id: string) {
  return page.locator(`#drawer-row-list a[href="/dashboard/row/${id}"]`);
}

async function openDrawer(page: Page): Promise<void> {
  await page.locator("label.drawer-button").click();
}

/**
 * The three behaviors the user asked for, shared between the guest and
 * authenticated describes. Each describe's beforeEach is responsible for
 * seeding the board (localStorage for guests, KV for authenticated users) —
 * these checks only navigate and assert.
 */
function drawerNavChecks(t: typeof test | typeof testNoClerk) {
  t(
    "drawer link scrolls the page down to the intended row",
    async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 600 });
      await page.goto("/dashboard");
      await page.locator(DASHBOARD_READY).waitFor({ state: "attached" });

      // The last row starts below the fold.
      const lastRow = page.locator("#row-section-row-e2e-8");
      expect(await page.evaluate(() => globalThis.scrollY)).toBe(0);
      await expect(lastRow).not.toBeInViewport();

      await openDrawer(page);
      const link = rowLink(page, "row-e2e-8");
      await expect(link).toBeVisible();
      await link.click();

      await expect(lastRow).toBeInViewport();
      expect(await page.evaluate(() => globalThis.scrollY)).toBeGreaterThan(0);
    },
  );

  t(
    "clicking a drawer link on the dashboard does not fully reload the page",
    async ({ page }) => {
      await page.goto("/dashboard");
      await page.locator(DASHBOARD_READY).waitFor({ state: "attached" });

      // A full document reload wipes the JS context; a client-side React Router
      // navigation preserves it. This sentinel is our reload detector.
      await page.evaluate(() => {
        (globalThis as Record<string, unknown>).__noReload = true;
      });

      await openDrawer(page);
      const link = rowLink(page, "row-e2e-2");
      await expect(link).toBeVisible();
      await link.click();

      await expect(page).toHaveURL(/\/dashboard\/row\/row-e2e-2$/);
      expect(
        await page.evaluate(() =>
          (globalThis as Record<string, unknown>).__noReload
        ),
      ).toBe(true);
      await expect(page.locator("#row-section-row-e2e-2")).toBeInViewport();
    },
  );

  t(
    "clicking a drawer link from outside the dashboard shows the loading screen, then the row",
    async ({ page }) => {
      // "/" is the only page outside the SPA that renders the drawer.
      await page.goto("/");
      // Open the drawer, then confirm the row link is there before clicking
      // (guest: populated by the DrawerMenu client script from localStorage;
      // authenticated: server-rendered into the HTML).
      await openDrawer(page);
      await expect(rowLink(page, "row-e2e-2")).toBeVisible();

      // Sentinel proves the click triggers a *full* navigation (new JS context).
      await page.evaluate(() => {
        (globalThis as Record<string, unknown>).__sentinel = true;
      });

      // Deterministically prove the loading screen is *served*: for client:only,
      // Astro renders the slot="fallback" markup into the destination's HTML.
      let loadingHtmlServed = false;
      await page.route("**/dashboard/row/*", async (route: Route) => {
        if (route.request().resourceType() !== "document") {
          await route.continue();
          return;
        }
        const res = await route.fetch();
        const body = await res.text();
        if (body.includes("Task dashboard is loading...")) {
          loadingHtmlServed = true;
        }
        await route.fulfill({ response: res });
      });

      // Slow the destination's JS modules so the (server-rendered) loading screen
      // stays painted long enough to assert it's visible before hydration swaps it.
      await page.route(/\.(?:m?js|tsx?|jsx)(?:\?|$)/, async (route: Route) => {
        await new Promise((r) => setTimeout(r, 400));
        await route.continue();
      });

      await rowLink(page, "row-e2e-2").click();

      await expect(page).toHaveURL(/\/dashboard\/row\/row-e2e-2$/);
      await expect(page.getByText("Task dashboard is loading..."))
        .toBeVisible();
      expect(loadingHtmlServed).toBe(true);

      // The row appears once the SPA hydrates and the board loads.
      const row = page.locator("#row-section-row-e2e-2");
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toBeInViewport();

      // It was a full navigation, not client-side: the homepage sentinel is gone.
      expect(
        await page.evaluate(() =>
          (globalThis as Record<string, unknown>).__sentinel
        ),
      ).toBeUndefined();
    },
  );
}

testNoClerk.describe("Drawer row navigation (guest)", () => {
  testNoClerk.beforeEach(async ({ page }) => {
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, BOARD_STATE);
  });

  drawerNavChecks(testNoClerk);
});

test.describe("Drawer row navigation (authenticated)", () => {
  const E2E_EMAIL = process.env.E2E_CLERK_USER_EMAIL ?? "";

  test.beforeEach(async ({ page, browserName }) => {
    // Mutates the shared Clerk test account's board in KV — single browser only
    // so concurrent runs don't race over the same board.
    test.skip(
      browserName !== "chromium",
      "shares one Clerk test account across runs",
    );
    await page.goto("/dashboard");
    await clerk.signIn({ page, emailAddress: E2E_EMAIL });

    // Clear any leftover board, then seed KV directly via the authenticated API
    // so the server-rendered drawer reads known rows.
    const cleared = await page.request.get("/api/delete-test-data");
    expect(cleared.status()).toBe(200);
    const seeded = await page.request.put("/api/board", { data: BOARD_STATE });
    expect(seeded.ok()).toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    await page.request.get("/api/delete-test-data");
  });

  test("server-renders the project-row list for a logged-in user", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("#drawer-row-list")).toHaveAttribute(
      "data-authenticated",
      "true",
    );
    // Links are in the SSR HTML — present without the guest client script.
    await expect(rowLink(page, "row-e2e-1")).toHaveCount(1);
    await expect(rowLink(page, "row-e2e-8")).toHaveCount(1);
  });

  drawerNavChecks(test);
});
