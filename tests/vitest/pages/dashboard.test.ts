// @vitest-environment node
import { createTestContainer } from "../setup.ts";
import { beforeAll, describe, expect, test } from "vitest";
import DashboardPage from "@pages/dashboard/index.astro";
import { JSDOM } from "jsdom";

describe("Astro components loaded in on the dashboard page", () => {
  let container: Awaited<ReturnType<typeof createTestContainer>>;
  let result: string;

  beforeAll(async () => {
    container = await createTestContainer();
    result = await container.renderToString(DashboardPage, {
      locals: {
        boardId: "test-board-id",
        auth: () => ({ userId: null }),
      },
    });
  });

  test("BoardController is rendered with react as the client framework", () => {
    expect(result).toContain(`BoardController`);

    const { document } = new JSDOM(result).window;
    const el = document.querySelector(
      'astro-island[component-url*="BoardController"][client="only"]',
    );

    expect(el).not.toBeNull();
    expect(el?.getAttribute("renderer-url")).toContain("react");
  });

  test("ThemeToggle renders on the client with the react client framework", () => {
    expect(result).toContain(`ThemeToggle`);

    const { document } = new JSDOM(result).window;
    const el = document.querySelector(
      'astro-island[component-url*="ThemeToggle"][client="only"]',
    );

    expect(el).not.toBeNull();
    expect(el?.getAttribute("renderer-url")).toContain("react");
  });
});
