/// <reference lib="dom" />
import { clerk } from "@clerk/testing/playwright";
import { type Page } from "@playwright/test";
import { expect, type SessionTest, test, testNoClerk } from "./fixtures.ts";

/**
 * The drawer's project-row list (#drawer-row-list, rendered by
 * DrawerMenu.astro) and the BoardMenu's dropdown mirror of it
 * ([data-drawer-row-list-mirror] in BoardMenu.tsx) are populated from two
 * different code paths — SSR/localStorage for the drawer, React board state for
 * the mirror. These tests pin them together: whatever rows one lists, the other
 * must list the same, for both guest and authenticated sessions.
 */
const BOARD_STATE = {
  rows: [
    {
      id: "row-mirror-1",
      title: "Alpha",
      color: "var(--color-row-blue)",
      order: "a0",
    },
    {
      id: "row-mirror-2",
      title: "Bravo",
      color: "var(--color-row-red)",
      order: "a1",
    },
    {
      id: "row-mirror-3",
      title: "Charlie",
      color: "var(--color-row-green)",
      order: "a2",
    },
  ],
  columns: [
    {
      id: "col-mirror-1",
      title: "To Do",
      order: "a0",
      pinnedToShortcut: false,
      pinnedToDock: false,
      iconInBoardMenu: false,
      iconNearColumnTitle: false,
    },
  ],
  tasks: [],
};

const DASHBOARD_READY = "html[data-board-loaded='true']";
const DRAWER_LIST = "#drawer-row-list";
// Scope to the real board menu (the config-modal preview also renders a mirror).
const MENU_MIRROR = "#board-menu [data-drawer-row-list-mirror]";

// The href + label of every row link under a list, sorted by href so the two
// lists compare as sets regardless of DOM order.
function rowOptions(page: Page, listSelector: string) {
  return page.locator(`${listSelector} a[data-board-link]`).evaluateAll((els) =>
    els
      .map((a) => ({
        href: new URL((a as HTMLAnchorElement).href).pathname,
        title: (a.textContent ?? "").trim(),
      }))
      .sort((x, y) => x.href.localeCompare(y.href))
  );
}

// Shared assertion for both session types: each describe's beforeEach seeds the
// same board (localStorage for guests, KV for authenticated), so the drawer and
// the BoardMenu mirror must end up listing the identical set of rows.
function mirrorMatchesDrawer(t: SessionTest) {
  t(
    "the BoardMenu row menu mirrors the drawer's row list",
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/dashboard");
      await page.locator(DASHBOARD_READY).waitFor({ state: "attached" });

      const expectedCount = BOARD_STATE.rows.length;
      // Both populate asynchronously (guest drawer via client script; mirror via
      // React), so wait for each to reach the seeded count before comparing.
      await expect(page.locator(`${DRAWER_LIST} a[data-board-link]`))
        .toHaveCount(expectedCount);
      await expect(page.locator(`${MENU_MIRROR} a[data-board-link]`))
        .toHaveCount(expectedCount);

      const [drawerOptions, mirrorOptions] = await Promise.all([
        rowOptions(page, DRAWER_LIST),
        rowOptions(page, MENU_MIRROR),
      ]);

      // Guard against a false pass where both are empty/wrong.
      expect(drawerOptions).toHaveLength(expectedCount);
      expect(mirrorOptions).toEqual(drawerOptions);
    },
  );
}

testNoClerk.describe("Drawer/BoardMenu row-list parity (guest)", () => {
  testNoClerk.beforeEach(async ({ page }) => {
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, BOARD_STATE);
  });

  mirrorMatchesDrawer(testNoClerk);
});

test.describe("Drawer/BoardMenu row-list parity (authenticated)", () => {
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

    const cleared = await page.request.get("/api/delete-test-data");
    expect(cleared.status()).toBe(200);
    const seeded = await page.request.put("/api/board", { data: BOARD_STATE });
    expect(seeded.ok()).toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    await page.request.get("/api/delete-test-data");
  });

  mirrorMatchesDrawer(test);
});
