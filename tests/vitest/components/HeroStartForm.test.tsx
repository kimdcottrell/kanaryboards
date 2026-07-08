import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HeroStartForm from "@components/HeroStartForm.tsx";
import { STORAGE_KEY } from "@components/context/constants.ts";

const MOCK_TITLES = ["Book venue", "Send invites", "Order cake"];

// jsdom's location is a real navigator that logs "Not implemented: navigation"
// when href is assigned. Swap it for a plain object so the component's
// `location.href = "/dashboard"` is observable and side-effect free.
const realLocation = globalThis.location;
function stubLocation() {
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    writable: true,
    value: { href: "" },
  });
}
function restoreLocation() {
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    writable: true,
    value: realLocation,
  });
}

// Default fetch: /api/generate-tasks succeeds, GET /api/board 404s (no board
// yet), PUT /api/board succeeds.
function makeFetch(
  generate: () => Promise<{ ok: boolean; json: () => Promise<unknown> }>,
) {
  return vi.fn((input: string, init?: { method?: string }) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.includes("/api/generate-tasks")) return generate();
    if (url.includes("/api/board")) {
      if (method === "GET") {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

const generateOk = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ response: MOCK_TITLES }),
  });

function submitGoal(goal: string) {
  const input = screen.getByPlaceholderText("What do you want to do?");
  fireEvent.change(input, { target: { value: goal } });
  fireEvent.submit(input.closest("form")!);
}

beforeEach(() => {
  stubLocation();
  globalThis.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreLocation();
  globalThis.localStorage.clear();
});

describe("HeroStartForm", () => {
  test("renders a required input and the Get Started button", () => {
    vi.stubGlobal("fetch", makeFetch(generateOk));
    render(<HeroStartForm isAuthenticated={false} />);
    const input = screen.getByPlaceholderText("What do you want to do?");
    expect(input.hasAttribute("required")).toBe(true);
    expect(screen.getByRole("button", { name: "Get Started" })).toBeTruthy();
  });

  test("empty submit calls no API and does not navigate", () => {
    const fetchMock = makeFetch(generateOk);
    vi.stubGlobal("fetch", fetchMock);
    render(<HeroStartForm isAuthenticated={false} />);

    const input = screen.getByPlaceholderText("What do you want to do?");
    fireEvent.submit(input.closest("form")!);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(globalThis.location.href).toBe("");
  });

  test("anonymous: generates tasks, persists to localStorage, and redirects", async () => {
    const fetchMock = makeFetch(generateOk);
    vi.stubGlobal("fetch", fetchMock);
    render(<HeroStartForm isAuthenticated={false} />);

    submitGoal("Plan a party");

    await waitFor(() => expect(globalThis.location.href).toBe("/dashboard"));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generate-tasks",
      expect.objectContaining({ method: "POST" }),
    );
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    expect(stored).toContain("Plan a party");
    expect(stored).toContain("Book venue");
  });

  test("shows the generating alert while the API is pending", async () => {
    let resolveGen!: () => void;
    const deferred = () =>
      new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
        resolveGen = () =>
          resolve({
            ok: true,
            json: () => Promise.resolve({ response: MOCK_TITLES }),
          });
      });
    vi.stubGlobal("fetch", makeFetch(deferred));
    render(<HeroStartForm isAuthenticated={false} />);

    submitGoal("Plan a party");

    expect(await screen.findByText("Generating tasks...")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Get Started" })).toHaveProperty(
      "disabled",
      true,
    );

    resolveGen();
    await waitFor(() => expect(globalThis.location.href).toBe("/dashboard"));
  });

  test("error path: shows an error alert, re-enables the button, no redirect", async () => {
    const generateFail = () =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "boom" }),
      });
    vi.stubGlobal("fetch", makeFetch(generateFail));
    render(<HeroStartForm isAuthenticated={false} />);

    submitGoal("Plan a party");

    expect(await screen.findByText(/Unable to generate tasks/)).toBeTruthy();
    expect(globalThis.location.href).toBe("");
    expect(screen.getByRole("button", { name: "Get Started" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  test("authenticated: persists via PUT /api/board before redirecting", async () => {
    const fetchMock = makeFetch(generateOk);
    vi.stubGlobal("fetch", fetchMock);
    render(<HeroStartForm isAuthenticated />);

    submitGoal("Plan a party");

    await waitFor(() => expect(globalThis.location.href).toBe("/dashboard"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
