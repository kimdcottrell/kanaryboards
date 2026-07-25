import { dark } from "@clerk/ui/themes";
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { applyTheme, DAY_THEME, NIGHT_THEME } from "@components/theme/theme.ts";

// Controllable Clerk state driving the mocked control components below, so each
// load/auth branch of LoginControls can be exercised deterministically.
const clerk = vi.hoisted(() => ({ isLoaded: false, signedIn: false }));

vi.mock("@clerk/astro/react", () => ({
  ClerkLoading: ({ children }: { children: React.ReactNode }) =>
    clerk.isLoaded ? null : children,
  ClerkLoaded: ({ children }: { children: React.ReactNode }) =>
    clerk.isLoaded ? children : null,
  Show: ({ when, children }: { when: string; children: React.ReactNode }) => {
    const matches = when === "signed-in" ? clerk.signedIn : !clerk.signedIn;
    return matches ? children : null;
  },
  SignInButton: (
    { children, appearance }: {
      children: React.ReactNode;
      appearance?: unknown;
    },
  ) =>
    React.createElement(
      "div",
      {
        "data-testid": "sign-in-button",
        "data-appearance": JSON.stringify(appearance ?? null),
      },
      children,
    ),
  UserButton: ({ appearance }: { appearance?: unknown }) =>
    React.createElement("div", {
      "data-testid": "user-button",
      "data-appearance": JSON.stringify(appearance ?? null),
    }),
}));

import LoginControls from "@components/LoginControls.tsx";

// jsdom doesn't implement matchMedia; LoginControls' initial theme read
// (getPreferredTheme) falls back to it when localStorage has no saved theme.
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
});

afterEach(() => {
  clerk.isLoaded = false;
  clerk.signedIn = false;
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

describe("LoginControls", () => {
  test("shows the skeleton while Clerk is loading", () => {
    clerk.isLoaded = false;
    const { container } = render(<LoginControls />);

    expect(container.querySelector(".skeleton")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign In" })).toBeNull();
  });

  test("shows the Sign In button when loaded and signed out", () => {
    clerk.isLoaded = true;
    clerk.signedIn = false;
    render(<LoginControls />);

    const button = screen.getByRole("button", { name: "Sign In" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("btn-warning");
    expect(screen.queryByTestId("user-button")).toBeNull();
  });

  test("shows the UserButton when loaded and signed in", () => {
    clerk.isLoaded = true;
    clerk.signedIn = true;
    render(<LoginControls />);

    expect(screen.getByTestId("user-button")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign In" })).toBeNull();
  });

  // Guards the regression we hit: SignedIn/SignedOut are NOT exported by
  // @clerk/astro/react, so importing them yields `undefined` and crashes the
  // island on hydration. Assert every name LoginControls imports is real.
  test("imports only real @clerk/astro/react exports", async () => {
    const real = await vi.importActual<Record<string, unknown>>(
      "@clerk/astro/react",
    );

    for (
      const name of [
        "ClerkLoading",
        "ClerkLoaded",
        "Show",
        "SignInButton",
        "UserButton",
      ]
    ) {
      expect(typeof real[name]).toBe("function");
    }
  });
});

describe("LoginControls — Clerk theme wiring", () => {
  const getAppearance = (testId: string) =>
    JSON.parse(
      screen.getByTestId(testId).getAttribute("data-appearance") ?? "null",
    );

  test("SignInButton gets the dark Clerk theme when the site is in night mode", () => {
    localStorage.setItem("theme", NIGHT_THEME);
    clerk.isLoaded = true;
    clerk.signedIn = false;
    render(<LoginControls />);

    expect(getAppearance("sign-in-button")).toEqual({ theme: dark });
  });

  test("SignInButton gets no appearance override in day mode", () => {
    localStorage.setItem("theme", DAY_THEME);
    clerk.isLoaded = true;
    clerk.signedIn = false;
    render(<LoginControls />);

    expect(getAppearance("sign-in-button")).toBeNull();
  });

  test("UserButton gets the dark Clerk theme when the site is in night mode", () => {
    localStorage.setItem("theme", NIGHT_THEME);
    clerk.isLoaded = true;
    clerk.signedIn = true;
    render(<LoginControls />);

    expect(getAppearance("user-button")).toEqual({ theme: dark });
  });

  test("UserButton gets no appearance override in day mode", () => {
    localStorage.setItem("theme", DAY_THEME);
    clerk.isLoaded = true;
    clerk.signedIn = true;
    render(<LoginControls />);

    expect(getAppearance("user-button")).toBeNull();
  });

  test("live-updates appearance when the site theme is toggled after mount", () => {
    localStorage.setItem("theme", DAY_THEME);
    clerk.isLoaded = true;
    clerk.signedIn = false;
    render(<LoginControls />);

    expect(getAppearance("sign-in-button")).toBeNull();

    act(() => {
      applyTheme(NIGHT_THEME);
    });

    expect(getAppearance("sign-in-button")).toEqual({ theme: dark });
  });
});
