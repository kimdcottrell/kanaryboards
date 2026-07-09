// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function (this: { emails: unknown }) {
    this.emails = { send: mockSend };
  }),
}));

const apiContext = (request: Request): APIContext =>
  ({ request }) as APIContext;

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidRequest() {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{",
  });
}

const validPayload = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Hello there, this is a message.",
};

async function importPOST() {
  const mod = await import("@pages/api/contact.ts");
  return mod.POST;
}

describe("POST /api/contact", () => {
  describe("when email service is not configured", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.stubEnv("RESEND_API_KEY", "");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    test("returns 503 and never calls Resend", async () => {
      const POST = await importPOST();
      const res = await POST(apiContext(makeRequest(validPayload)));
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe("Email service is not configured.");
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("when email service is configured", () => {
    let POST: Awaited<ReturnType<typeof importPOST>>;

    beforeEach(async () => {
      vi.resetModules();
      vi.stubEnv("RESEND_API_KEY", "test-api-key");
      mockSend.mockReset();
      mockSend.mockResolvedValue({ data: { id: "email-id" }, error: null });
      POST = await importPOST();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    describe("request body validation — never reaches Resend", () => {
      test("returns 400 when body is not valid JSON", async () => {
        const res = await POST(apiContext(makeInvalidRequest()));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Invalid request body.");
        expect(mockSend).not.toHaveBeenCalled();
      });

      test("returns 400 when name is missing", async () => {
        const { name: _name, ...rest } = validPayload;
        const res = await POST(apiContext(makeRequest(rest)));
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });

      test("returns 400 when email is missing", async () => {
        const { email: _email, ...rest } = validPayload;
        const res = await POST(apiContext(makeRequest(rest)));
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });

      test("returns 400 when message is missing", async () => {
        const { message: _message, ...rest } = validPayload;
        const res = await POST(apiContext(makeRequest(rest)));
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });

      test("returns 400 when name exceeds 100 characters", async () => {
        const res = await POST(
          apiContext(makeRequest({ ...validPayload, name: "a".repeat(101) })),
        );
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });

      test("returns 400 when message exceeds 500 characters", async () => {
        const res = await POST(
          apiContext(
            makeRequest({ ...validPayload, message: "a".repeat(501) }),
          ),
        );
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });

      test("returns 400 for an invalid email format", async () => {
        const res = await POST(
          apiContext(makeRequest({ ...validPayload, email: "not-an-email" })),
        );
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });

      // zod's .email() rejects control characters, so a CRLF-shaped attempt at
      // smuggling extra headers through replyTo never reaches emails.send.
      test("returns 400 for a CRLF header-injection-shaped email", async () => {
        const res = await POST(
          apiContext(
            makeRequest({
              ...validPayload,
              email: "a@b.com\r\nBcc: victim@x.com",
            }),
          ),
        );
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });

      test("returns 400 when a field is the wrong type", async () => {
        const res = await POST(
          apiContext(makeRequest({ ...validPayload, name: ["a", "b"] })),
        );
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });

      test("returns 400 for whitespace-only fields", async () => {
        const res = await POST(
          apiContext(makeRequest({ ...validPayload, message: "   " })),
        );
        expect(res.status).toBe(400);
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    describe("XSS escaping in the outgoing email HTML", () => {
      test("escapes a <script> tag in the name field", async () => {
        await POST(
          apiContext(
            makeRequest({
              ...validPayload,
              name: "<script>alert(1)</script>",
            }),
          ),
        );
        const [[{ html }]] = mockSend.mock.calls;
        expect(html).not.toContain("<script>alert(1)</script>");
        expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      });

      test("escapes an attribute-breaking payload in the message field", async () => {
        await POST(
          apiContext(
            makeRequest({
              ...validPayload,
              message: `"><img src=x onerror=alert(1)>`,
            }),
          ),
        );
        const [[{ html }]] = mockSend.mock.calls;
        expect(html).not.toContain(`"><img src=x onerror=alert(1)>`);
        expect(html).toContain("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;");
      });

      test("escapes ampersands and apostrophes in the message field", async () => {
        await POST(
          apiContext(
            makeRequest({
              ...validPayload,
              message: "Tom & Jerry's <b>bold</b> plan",
            }),
          ),
        );
        const [[{ html }]] = mockSend.mock.calls;
        expect(html).toContain(
          "Tom &amp; Jerry&#39;s &lt;b&gt;bold&lt;/b&gt; plan",
        );
      });

      test("converts newlines to <br /> only after escaping", async () => {
        await POST(
          apiContext(
            makeRequest({
              ...validPayload,
              message: "line one\n<script>bad()</script>",
            }),
          ),
        );
        const [[{ html }]] = mockSend.mock.calls;
        expect(html).toContain(
          "line one<br />&lt;script&gt;bad()&lt;/script&gt;",
        );
      });
    });

    describe("Resend call shape", () => {
      test("sets replyTo to the validated email exactly", async () => {
        await POST(apiContext(makeRequest(validPayload)));
        const [[args]] = mockSend.mock.calls;
        expect(args.replyTo).toBe(validPayload.email);
      });

      test("strips unknown/prototype-pollution-shaped keys from the body", async () => {
        const res = await POST(
          apiContext(
            makeRequest({
              ...validPayload,
              "__proto__": { polluted: true },
              isAdmin: true,
            }),
          ),
        );
        expect(res.status).toBe(200);
        const [[args]] = mockSend.mock.calls;
        // zod's default "strip" mode drops unrecognized keys, so neither the
        // extra `isAdmin` flag nor the `__proto__`-shaped payload reach the
        // outgoing email — only the three known fields do.
        expect(args.html).not.toContain("isAdmin");
        expect(args.html).not.toContain("polluted");
        expect(Object.keys(args)).toEqual(
          expect.arrayContaining(["from", "to", "replyTo", "subject", "html"]),
        );
      });

      test("returns 502 when Resend reports an error", async () => {
        mockSend.mockResolvedValue({
          data: null,
          error: { message: "Resend is down" },
        });
        const res = await POST(apiContext(makeRequest(validPayload)));
        expect(res.status).toBe(502);
        const json = await res.json();
        expect(json.error).toBe("Failed to send message.");
      });
    });

    // Documents a known gap rather than fixing it: /api/contact has no rate
    // limiting or bot challenge (Cloudflare Turnstile is allowlisted in the
    // CSP for Clerk but isn't wired to this form). A real fix — Turnstile
    // verification or edge/KV-based rate limiting — is a separate, larger
    // change; this test just proves the current behavior so a future fix
    // has something concrete to change.
    test("known gap: repeated valid requests are never throttled", async () => {
      const requests = Array.from(
        { length: 20 },
        () => POST(apiContext(makeRequest(validPayload))),
      );
      const results = await Promise.all(requests);
      expect(results.every((res) => res.status === 200)).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(20);
    });
  });
});
