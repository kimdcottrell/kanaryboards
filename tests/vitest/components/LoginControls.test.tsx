import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

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
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () =>
    React.createElement("div", { "data-testid": "user-button" }),
}));

import LoginControls from "@components/LoginControls.tsx";

afterEach(() => {
  clerk.isLoaded = false;
  clerk.signedIn = false;
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
