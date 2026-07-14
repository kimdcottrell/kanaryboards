/// <reference lib="dom" />
import type { Page } from "@playwright/test";
import { expect, fillControlled, testNoClerk as test } from "../fixtures.ts";

// A "malicious user" suite for AI-sourced content (task titles from the
// homepage hero form, checklist items from the AI checklist generator).
// /api/generate-tasks is mocked in every test — no real Gemini calls — and
// the payloads returned are XSS-shaped strings. The point isn't to test
// Gemini's output; it's to prove that whatever text an LLM hands back is
// rendered as inert text (React's default JSX escaping), never as markup.
//
// Lives under preview-only/ per policy: no Playwright spec that renders
// attack-shaped payloads onto a live page should be reachable via
// `deno task e2e-test`, whose BASE_URL can point at a real deployed
// environment.

const MALICIOUS_TITLES = [
  "<script>window.__xss=1; console.log('pwned')</script>",
  '<img src=x onerror="window.__xss=1">',
  '"><svg onload="window.__xss=1">',
];

const DASHBOARD_READY = "html[data-board-loaded='true']";

function mockGenerateTasks(page: Page, titles: string[]) {
  return page.route("/api/generate-tasks", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response: titles }),
    }));
}

async function xssRan(page: Page): Promise<boolean> {
  return await page.evaluate(() =>
    (globalThis as Record<string, unknown>).__xss === 1
  );
}

test.describe("Hero form — AI-generated task titles render as inert text", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("malicious task titles never execute and render as literal text", async ({ page }) => {
    await mockGenerateTasks(page, MALICIOUS_TITLES);
    const goal = "Plan a birthday party";

    await fillControlled(
      page.getByPlaceholder("What do you want to do?"),
      goal,
    );
    await page.getByRole("button", { name: "Get Started" }).click();

    await page.waitForURL("**/dashboard");
    await page.locator(DASHBOARD_READY).waitFor({ state: "attached" });

    const row = page.locator("[id^='row-section-']").filter({
      has: page.getByRole("heading", { name: goal }),
    });

    for (const title of MALICIOUS_TITLES) {
      const heading = row.getByRole("heading", { name: title });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(title);
      // No element got created from the payload inside the heading — it's
      // one plain text node.
      expect(await heading.locator("script, img, svg").count()).toBe(0);
    }

    expect(await xssRan(page)).toBe(false);
  });
});

test.describe("Checklist AI generation — malicious items render as inert text", () => {
  const BOARD_STATE = {
    rows: [
      {
        id: "row-e2e-1",
        title: "Engineering",
        color: "var(--color-row-blue)",
        order: "a0",
      },
    ],
    columns: [
      { id: "col-e2e-1", title: "To Do", order: "a0" },
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
    ],
  };

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((board) => {
      localStorage.setItem("kanby-v0-1-0", JSON.stringify(board));
    }, BOARD_STATE);
    await page.goto("/dashboard");
    await expect(page.locator("#row-section-row-e2e-1")).toBeVisible();
  });

  // The checklist generation collapse animates its `grid-template-rows` over
  // 0.2s (see daisyUI's .collapse) — copied from render-isolation.spec.ts.
  async function waitForChecklistCollapseOpen(page: Page) {
    await page.locator("#checklist-gen-collapse").evaluate((el: Element) =>
      new Promise<void>((resolve) => {
        const tick = () => {
          const animating = el.getAnimations({ subtree: true }).length > 0;
          const content = el.querySelector("#checklist-gen-collapse-content");
          const open = (content?.getBoundingClientRect().height ?? 0) > 0;
          if (!animating && open) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
    );
  }

  test("malicious checklist items never execute and render as literal input values", async ({ page }) => {
    await mockGenerateTasks(page, MALICIOUS_TITLES);

    await page.locator("#row-columns-row-e2e-1").getByText("Write specs", {
      exact: true,
    }).click();
    await expect(page.getByRole("heading", { name: "Edit task" }))
      .toBeVisible();
    await waitForChecklistCollapseOpen(page);

    const prompt = page.locator(
      "#checklist-gen-collapse-content input[type='text']",
    );
    await prompt.fill("Break this down into steps");

    await page.locator("#checklist-gen-collapse-content").getByRole(
      "button",
      { name: "Generate Checklist Items" },
    ).click();

    await expect(
      page.getByRole("cell", { name: MALICIOUS_TITLES[0] }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Copy checklist items to task" })
      .click();

    // Editing a task whose checklist starts empty seeds one blank row of its
    // own (see openEditModal in reducers/tasks.ts), so the 3 malicious items
    // land alongside it rather than being the only rows.
    const itemInputs = page.locator(
      "[data-checklist-item] input[type='text']",
    );
    await expect(itemInputs).toHaveCount(MALICIOUS_TITLES.length + 1);
    const values = await itemInputs.evaluateAll((els) =>
      (els as HTMLInputElement[]).map((el) => el.value)
    );
    for (const title of MALICIOUS_TITLES) {
      expect(values).toContain(title);
    }

    expect(await xssRan(page)).toBe(false);
    expect(
      await page.locator(
        "[data-checklist-item] script, [data-checklist-item] img, [data-checklist-item] svg",
      ).count(),
    ).toBe(0);
  });
});
