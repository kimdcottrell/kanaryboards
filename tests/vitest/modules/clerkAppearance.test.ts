import { dark } from "@clerk/ui/themes";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getClerkAppearance,
  getClerkAppearanceForCurrentTheme,
} from "@components/theme/clerkAppearance.ts";
import { DAY_THEME, NIGHT_THEME } from "@components/theme/theme.ts";

describe("getClerkAppearance", () => {
  it("returns the dark Clerk theme for NIGHT_THEME", () => {
    expect(getClerkAppearance(NIGHT_THEME)).toEqual({ theme: dark });
  });

  it("returns undefined for DAY_THEME", () => {
    expect(getClerkAppearance(DAY_THEME)).toBeUndefined();
  });

  it("returns undefined for an unrecognized theme", () => {
    expect(getClerkAppearance("unknown")).toBeUndefined();
  });
});

describe("getClerkAppearanceForCurrentTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("returns the dark Clerk theme when data-theme is NIGHT_THEME", () => {
    document.documentElement.setAttribute("data-theme", NIGHT_THEME);
    expect(getClerkAppearanceForCurrentTheme()).toEqual({ theme: dark });
  });

  it("returns undefined when data-theme is DAY_THEME", () => {
    document.documentElement.setAttribute("data-theme", DAY_THEME);
    expect(getClerkAppearanceForCurrentTheme()).toBeUndefined();
  });

  it("returns undefined when data-theme is unset", () => {
    expect(getClerkAppearanceForCurrentTheme()).toBeUndefined();
  });
});
