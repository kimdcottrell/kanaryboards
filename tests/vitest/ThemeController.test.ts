// @vitest-environment node
import { createTestContainer } from "./setup.ts";
import { expect, test, beforeAll } from "vitest";
import ThemeController from "@components/ThemeController.astro";

let rendered: string;

beforeAll(async () => {
    const container = await createTestContainer();
    rendered = await container.renderToString(ThemeController, {});
});

test("ThemeController reads saved theme from localStorage", () => {
    expect(rendered).toContain(`localStorage.getItem("theme")`);
});

test("ThemeController falls back to matchMedia for prefers-color-scheme", () => {
    expect(rendered).toContain(`matchMedia("(prefers-color-scheme: dark)")`);
});

test("ThemeController defaults dark preference to kanary-night theme", () => {
    expect(rendered).toContain(`"kanary-night"`);
});

test("ThemeController defaults light preference to kanary-day theme", () => {
    expect(rendered).toContain(`"kanary-day"`);
});

test("ThemeController sets data-theme attribute on the html element", () => {
    expect(rendered).toContain(`setAttribute("data-theme", theme)`);
});

test("ThemeController toggles latte class for the light theme", () => {
    expect(rendered).toContain(`"latte"`);
    expect(rendered).toContain(`theme === "kanary-day"`);
});

test("ThemeController toggles mocha class for the dark theme", () => {
    expect(rendered).toContain(`"mocha"`);
    expect(rendered).toContain(`theme === "kanary-night"`);
});

test("ThemeController renders ThemeToggle as a client:only React component", () => {
    expect(rendered).toContain(`client="only"`);
    expect(rendered).toContain(`ThemeToggle`);
});
