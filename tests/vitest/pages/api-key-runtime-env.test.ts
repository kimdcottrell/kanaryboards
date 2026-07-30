import { describe, expect, test, vi } from "vitest";

// These tests guard HOW the API-key secrets are read, not what the endpoints do.
//
// The endpoints must read their secrets from `cloudflare:workers`' `env`.
// Two specific mechanisms are wrong here, and both fail invisibly:
//   - `import.meta.env.*` is statically inlined by Astro/Vite at build time,
//     so the value gets frozen into the Worker bundle (or baked as
//     `undefined` when the var isn't set at build time) and the
//     dashboard-configured runtime secret is silently ignored.
//   - `Astro.locals.runtime.env` was removed in Astro v6 — the adapter defines
//     it as a getter that throws, so it breaks at runtime instead.
// A value-based test can't distinguish these, so the mechanism is asserted
// directly against the source text.

vi.mock("resend", () => ({ Resend: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: vi.fn() }));

// Resolved against the vitest root (the repo root), not import.meta.url.
const readSource = (repoRelPath: string) =>
  Deno.readTextFileSync(`${Deno.cwd()}/${repoRelPath}`);

function assertReadsFromWorkersEnv(sourcePath: string, keys: string[]) {
  const src = readSource(sourcePath);
  expect(src).toContain('import { env } from "cloudflare:workers"');
  for (const key of keys) {
    expect(src).toContain(`env.${key}`);
    // MODE is a legitimate build-time constant, so only the keys under test
    // are asserted absent from import.meta.env.
    expect(src).not.toMatch(new RegExp(`import\\.meta\\.env\\.${key}`));
    expect(src).not.toMatch(new RegExp(`Deno\\.env\\.get\\(.${key}`));
  }
  expect(src).not.toContain("locals.runtime");
}

describe("API-key secrets are read from cloudflare:workers env", () => {
  test("contact endpoint — RESEND_API_KEY", () => {
    assertReadsFromWorkersEnv("src/pages/api/contact.ts", ["RESEND_API_KEY"]);
  });

  test("generate-tasks endpoint — GOOGLE_AI_STUDIO_KEY / _MODEL", () => {
    assertReadsFromWorkersEnv("src/pages/api/generate-tasks.ts", [
      "GOOGLE_AI_STUDIO_KEY",
      "GOOGLE_AI_STUDIO_MODEL",
    ]);
  });
});
