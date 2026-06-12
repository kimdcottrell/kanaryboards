import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  DAY_THEME,
  getPreferredTheme,
  NIGHT_THEME,
  toggleTheme,
} from "@components/theme/theme.ts";

const globalCss = await Deno.readTextFile(
  `${Deno.cwd()}/src/styles/global.css`,
);

describe("theme constants match global.css", () => {
  it("DAY_THEME is defined as a DaisyUI theme in global.css", () => {
    expect(globalCss).toContain(`name: "${DAY_THEME}"`);
  });

  it("NIGHT_THEME is defined as a DaisyUI theme in global.css", () => {
    expect(globalCss).toContain(`name: "${NIGHT_THEME}"`);
  });
});

describe("toggleTheme", () => {
  it("returns DAY_THEME when current is NIGHT_THEME", () => {
    expect(toggleTheme(NIGHT_THEME)).toBe(DAY_THEME);
  });

  it("returns NIGHT_THEME when current is DAY_THEME", () => {
    expect(toggleTheme(DAY_THEME)).toBe(NIGHT_THEME);
  });

  it("returns NIGHT_THEME for any non-NIGHT_THEME value", () => {
    expect(toggleTheme("unknown")).toBe(NIGHT_THEME);
  });
});

describe("getPreferredTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  it("returns saved theme from localStorage when present", () => {
    localStorage.setItem("theme", NIGHT_THEME);
    expect(getPreferredTheme()).toBe(NIGHT_THEME);
  });

  it("returns NIGHT_THEME when no saved theme and dark mode is preferred", () => {
    globalThis.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(getPreferredTheme()).toBe(NIGHT_THEME);
  });

  it("returns DAY_THEME when no saved theme and dark mode is not preferred", () => {
    expect(getPreferredTheme()).toBe(DAY_THEME);
  });
});

describe("applyTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.className = "";
  });

  it("sets data-theme attribute to the given theme", () => {
    applyTheme(DAY_THEME);
    expect(document.documentElement.getAttribute("data-theme")).toBe(DAY_THEME);
  });

  it("saves the theme to localStorage", () => {
    applyTheme(NIGHT_THEME);
    expect(localStorage.getItem("theme")).toBe(NIGHT_THEME);
  });

  it("adds latte class and removes mocha class for DAY_THEME", () => {
    applyTheme(DAY_THEME);
    expect(document.documentElement.classList.contains("latte")).toBe(true);
    expect(document.documentElement.classList.contains("mocha")).toBe(false);
  });

  it("adds mocha class and removes latte class for NIGHT_THEME", () => {
    applyTheme(NIGHT_THEME);
    expect(document.documentElement.classList.contains("mocha")).toBe(true);
    expect(document.documentElement.classList.contains("latte")).toBe(false);
  });
});
