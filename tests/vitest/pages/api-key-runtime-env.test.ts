// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// These tests guard HOW the API-key secrets are read, not what the endpoints do.
//
// The endpoints must read their secrets with Deno.env.get() rather than
// import.meta.env.*. Astro/Vite statically inlines import.meta.env.* at build
// time, so on Deno Deploy the value gets frozen in during the build (or baked
// as `undefined` when the var isn't present in the build environment) and the
// production runtime env var is silently ignored. Deno.env.get() is a true
// runtime lookup, so the dashboard-configured secret is actually honored.
//
// Note: a value-based test can't catch a regression here — under Deno, vitest's
// stubbed env bridges through to Deno.env, so import.meta.env.KEY would appear
// to "work" too. So we assert the mechanism directly: (1) Deno.env.get() is the
// function invoked, and (2) the source never reads these keys off import.meta.env.

// Mock the SDKs so importing the endpoints has no side effects — construction is
// skipped anyway (the keys are unset in the test env), but this keeps it robust.
vi.mock("resend", () => ({ Resend: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: vi.fn() }));

const readSource = (relPath: string) =>
  Deno.readTextFileSync(new URL(`../../../${relPath}`, import.meta.url));

describe("API-key secrets are read at runtime via Deno.env.get()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("contact endpoint — RESEND_API_KEY", () => {
    test("reads the key through Deno.env.get() at module load", async () => {
      const getSpy = vi.spyOn(Deno.env, "get");
      await import("@pages/api/contact.ts");
      expect(getSpy).toHaveBeenCalledWith("RESEND_API_KEY");
    });

    test("does not read the key off import.meta.env in source", () => {
      const src = readSource("src/pages/api/contact.ts");
      expect(src).toContain('Deno.env.get("RESEND_API_KEY")');
      expect(src).not.toMatch(/import\.meta\.env\.RESEND_API_KEY/);
    });
  });

  describe("generate-tasks endpoint — GOOGLE_AI_STUDIO_KEY / _MODEL", () => {
    test("reads both keys through Deno.env.get() at module load", async () => {
      const getSpy = vi.spyOn(Deno.env, "get");
      await import("@pages/api/generate-tasks.ts");
      expect(getSpy).toHaveBeenCalledWith("GOOGLE_AI_STUDIO_KEY");
      expect(getSpy).toHaveBeenCalledWith("GOOGLE_AI_STUDIO_MODEL");
    });

    test("does not read the keys off import.meta.env in source", () => {
      const src = readSource("src/pages/api/generate-tasks.ts");
      expect(src).toContain('Deno.env.get("GOOGLE_AI_STUDIO_KEY")');
      expect(src).toContain('Deno.env.get("GOOGLE_AI_STUDIO_MODEL")');
      // MODE is a legitimate build-time constant, so only the secret keys are
      // asserted absent from import.meta.env.
      expect(src).not.toMatch(/import\.meta\.env\.GOOGLE_AI_STUDIO/);
    });
  });
});
