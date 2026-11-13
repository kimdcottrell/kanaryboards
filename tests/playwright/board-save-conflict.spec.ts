/// <reference lib="dom" />
import type { Page } from "@playwright/test";
import {
  expect,
  fillStable,
  gotoAndWaitForClerk,
  testAuthed as test,
} from "./fixtures.ts";

/**
 * The web app's autosave sends the board revision it last saw (If-Match). A
 * save made after a write from elsewhere (the kanby CLI, another device) gets
 * a 409; the app then refetches, keeps its changes to entities nobody else
 * touched and resends them, and takes the server's version of anything that
 * was also changed elsewhere (useBoardPersistence.ts).
 */

const column = (id: string, title: string, order: string, isTrash = false) => ({
  id,
  title,
  order,
  pinnedToShortcut: false,
  pinnedToDock: false,
  icon: null,
  iconInBoardMenu: false,
  iconNearColumnTitle: false,
  isTrash,
});

const task = (id: string, title: string, order: string) => ({
  id,
  rowId: "row-sc-1",
  colId: "col-sc-todo",
  title,
  description: "",
  checklist: [],
  order,
  trashedAt: null,
  preTrashColId: null,
});

const BOARD_STATE = {
  rows: [{
    id: "row-sc-1",
    title: "Engineering",
    color: "var(--color-row-blue)",
    order: "a0",
  }],
  columns: [
    column("col-sc-todo", "To Do", "a0"),
    column("col-sc-doing", "In Progress", "a1"),
    column("col-sc-trash", "Trash", "a2", true),
  ],
  tasks: [task("task-sc-a", "Task A", "a0"), task("task-sc-b", "Task B", "a1")],
};

type StoredTask = (typeof BOARD_STATE.tasks)[number];

const serverTasks = async (page: Page): Promise<StoredTask[]> =>
  (await (await page.request.get("/api/v1/board")).json()).tasks;

// Renames a task the way a CLI save lands in KV: the entity is rewritten and
// the board revision moves on. Sent as an unchecked PATCH /api/v1/board (no
// If-Match) because the CLI's own routes need a Clerk OAuth token, which the
// E2E session doesn't have; server-side both go through applyBoardChanges.
async function renameElsewhere(page: Page, taskId: string, title: string) {
  const stored = (await serverTasks(page)).find((t) => t.id === taskId)!;
  const res = await page.request.patch("/api/v1/board", {
    data: {
      upserts: { rows: [], columns: [], tasks: [{ ...stored, title }] },
      deletes: { rowIds: [], columnIds: [], taskIds: [] },
    },
  });
  expect(res.ok()).toBeTruthy();
}

// Status of every autosave PATCH the page sends, in order.
function recordSaves(page: Page): number[] {
  const statuses: number[] = [];
  page.on("response", (res) => {
    const req = res.request();
    if (req.method() === "PATCH" && res.url().endsWith("/api/v1/board")) {
      statuses.push(res.status());
    }
  });
  return statuses;
}

const card = (page: Page, taskId: string) => page.locator(`article#${taskId}`);
const conflictAlert = (page: Page) =>
  page.getByRole("alert").filter({
    hasText: "Some of your changes were replaced.",
  });

test.describe("Autosave conflicts with writes made elsewhere", () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "shares one Clerk test account across runs",
    );
    // See drawer-row-nav.spec.ts: refresh the session on a page without the
    // board island, so its autosave can't race the seed.
    await gotoAndWaitForClerk(page, "/blog");
    expect((await page.request.delete("/api/v1/test-data")).status()).toBe(
      200,
    );
    const seeded = await page.request.patch("/api/v1/board", {
      data: {
        upserts: BOARD_STATE,
        deletes: { rowIds: [], columnIds: [], taskIds: [] },
      },
    });
    expect(seeded.ok()).toBeTruthy();

    // Without live refresh the app can't pick up the other write before the
    // user's edit, which holds open the window the 409 handling is for
    // (normally the time until the SSE event's refetch lands).
    await page.route("**/api/v1/board/events", (route) => route.abort());
    await page.goto("/dashboard");
    await page.locator("html[data-board-loaded='true']").waitFor({
      state: "attached",
    });
    await expect(card(page, "task-sc-b")).toBeVisible();
    // Let the post-load autosave timer (500ms) pass, so the only saves
    // recorded below are the ones each test triggers.
    await page.waitForTimeout(1000);
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete("/api/v1/test-data");
  });

  test("a change to another task is resent after the 409, with no notice", async ({ page }) => {
    const saves = recordSaves(page);
    await renameElsewhere(page, "task-sc-a", "Renamed in the CLI");

    await card(page, "task-sc-b").dragTo(
      page.locator("#column-section-row-sc-1-col-sc-doing"),
    );

    await expect.poll(() => saves).toEqual([409, 200]);
    await expect(
      page.locator("#column-section-row-sc-1-col-sc-doing").locator(
        "article#task-sc-b",
      ),
    ).toBeVisible();
    await expect(card(page, "task-sc-a").getByText("Renamed in the CLI"))
      .toBeVisible();
    await expect(conflictAlert(page)).toHaveCount(0);

    const tasks = await serverTasks(page);
    expect(tasks.find((t) => t.id === "task-sc-a")?.title).toBe(
      "Renamed in the CLI",
    );
    expect(tasks.find((t) => t.id === "task-sc-b")?.colId).toBe(
      "col-sc-doing",
    );
  });

  test("a task changed on both sides keeps the CLI's version, with a notice", async ({ page }) => {
    const saves = recordSaves(page);
    await renameElsewhere(page, "task-sc-a", "Renamed in the CLI");

    await card(page, "task-sc-a").getByText("Task A", { exact: true }).click();
    await expect(page.locator("dialog.modal-open")).toBeVisible();
    await fillStable(
      page.getByRole("textbox", { name: "Title" }),
      "Renamed in the app",
    );
    await page.locator("dialog.modal-open").getByRole("button", {
      name: "Save",
    }).click();
    await expect(page.locator("dialog.modal-open")).toHaveCount(0);

    await expect(conflictAlert(page)).toBeVisible();
    await expect(card(page, "task-sc-a").getByText("Renamed in the CLI"))
      .toBeVisible();
    // The merged board matches the server's, so nothing is resent.
    await page.waitForTimeout(1000);
    expect(saves).toEqual([409]);
    expect(
      (await serverTasks(page)).find((t) => t.id === "task-sc-a")?.title,
    ).toBe("Renamed in the CLI");

    await conflictAlert(page).getByRole("button", { name: "Dismiss" }).click();
    await expect(conflictAlert(page)).toHaveCount(0);
  });
});
