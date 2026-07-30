import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";
import { KNOWN_MODELS } from "../vitest/fixtures/genai-model.ts";
import { DEFAULT_MODEL, POST } from "@pages/api/generate-tasks.ts";

const mockGenerateContentStream = vi.hoisted(() => vi.fn());
const mockModelsList = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function (
    this: { models: unknown },
  ) {
    this.models = {
      generateContentStream: mockGenerateContentStream,
      list: mockModelsList,
    };
  }),
}));

const apiContext = (request: Request): APIContext =>
  ({ request }) as APIContext;

// The endpoint reads its secret from cloudflare:workers `env`, which is the
// same object `cloudflare:test` exposes — so tests set it there.
function setApiKey(value: string | undefined) {
  if (value === undefined) {
    delete (env as Record<string, unknown>).GOOGLE_AI_STUDIO_KEY;
  } else (env as Record<string, unknown>).GOOGLE_AI_STUDIO_KEY = value;
}

afterEach(() => {
  setApiKey(undefined);
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/generate-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidRequest() {
  return new Request("http://localhost/api/generate-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{",
  });
}

async function* streamChunks(chunks: string[]) {
  for (const chunk of chunks) {
    yield { text: chunk };
  }
}

describe("POST /api/generate-tasks", () => {
  describe("when AI service is not configured", () => {
    test("returns 503 with error message", async () => {
      setApiKey(undefined);
      const res = await POST(
        apiContext(makeRequest({ prompt: "build a kanban app" })),
      );
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe("AI service is not configured.");
    });
  });

  describe("when AI service is configured", () => {
    beforeEach(() => {
      setApiKey("test-api-key");
      mockGenerateContentStream.mockReset();
    });

    describe("request body validation", () => {
      test("returns 400 when body is not valid JSON", async () => {
        const res = await POST(apiContext(makeInvalidRequest()));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Invalid request body.");
      });

      test("returns 400 when prompt is missing from body", async () => {
        const res = await POST(apiContext(makeRequest({ maxTasks: 5 })));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Missing prompt.");
      });

      test("returns 400 when prompt is an empty string", async () => {
        const res = await POST(apiContext(makeRequest({ prompt: "" })));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Missing prompt.");
      });

      test("accepts prompt as a string and uses it in the AI call", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        const res = await POST(
          apiContext(makeRequest({ prompt: "build a crm", maxTasks: 4 })),
        );
        expect(res.status).toBe(200);
        const [args] = mockGenerateContentStream.mock.calls;
        expect(args[0].contents).toContain("build a crm");
      });

      test("coerces non-string prompt to string via String()", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        const res = await POST(
          apiContext(makeRequest({ prompt: 99, maxTasks: 2 })),
        );
        expect(res.status).toBe(200);
        const [args] = mockGenerateContentStream.mock.calls;
        expect(args[0].contents).toContain("99");
      });

      test("accepts maxTasks as a number and uses it to bound the task count", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app", maxTasks: 20 })),
        );
        expect(res.status).toBe(200);
        const [args] = mockGenerateContentStream.mock.calls;
        expect(args[0].contents).toContain("10 to 20");
      });

      test("defaults maxTasks to 10 when not provided", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        await POST(apiContext(makeRequest({ prompt: "build an app" })));
        const [args] = mockGenerateContentStream.mock.calls;
        expect(args[0].contents).toContain("5 to 10");
      });

      test("uses maxTasks in the system prompt", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        await POST(
          apiContext(makeRequest({ prompt: "build an app", maxTasks: 8 })),
        );
        const [args] = mockGenerateContentStream.mock.calls;
        expect(args[0].config.systemInstruction).toContain("8");
      });

      test("returns 400 when prompt exceeds the max length", async () => {
        const res = await POST(
          apiContext(makeRequest({ prompt: "a".repeat(2001) })),
        );
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Prompt is too long.");
      });

      test("accepts a prompt exactly at the max length", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        const res = await POST(
          apiContext(makeRequest({ prompt: "a".repeat(2000) })),
        );
        expect(res.status).toBe(200);
      });

      test("clamps maxTasks above the cap instead of sending it straight to the AI call", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        await POST(
          apiContext(makeRequest({ prompt: "build an app", maxTasks: 999999 })),
        );
        const [args] = mockGenerateContentStream.mock.calls;
        expect(args[0].contents).toContain("15 to 30");
        expect(args[0].contents).not.toContain("999999");
      });

      test("clamps a negative maxTasks up to the minimum", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        await POST(
          apiContext(makeRequest({ prompt: "build an app", maxTasks: -5 })),
        );
        const [args] = mockGenerateContentStream.mock.calls;
        expect(args[0].contents).toContain("0.5 to 1");
      });
    });

    describe("AI model", () => {
      test("uses the configured model name", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        await POST(apiContext(makeRequest({ prompt: "build an app" })));
        expect(mockGenerateContentStream).toHaveBeenCalledWith(
          expect.objectContaining({ model: DEFAULT_MODEL }),
        );
      });

      test("uses a model name known to the Gemini API", () => {
        expect(KNOWN_MODELS).toContain(DEFAULT_MODEL);
      });

      test("passes a systemInstruction about kanban task titles", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        await POST(apiContext(makeRequest({ prompt: "build an app" })));
        const [args] = mockGenerateContentStream.mock.calls;
        expect(args[0].config.systemInstruction).toContain("kanban board");
      });
    });

    describe("successful response", () => {
      test("returns 200 with tasks stripped of list markers", async () => {
        mockGenerateContentStream.mockReturnValue(
          streamChunks(["- Task one\n", "* Task two\n", "3. Task three"]),
        );
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.response).toEqual(["Task one", "Task two", "Task three"]);
      });

      test("strips trailing commas from task titles", async () => {
        mockGenerateContentStream.mockReturnValue(
          streamChunks(["1) First task,\n2. Second task,"]),
        );
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        const json = await res.json();
        expect(json.response).toEqual(["First task", "Second task"]);
      });

      test("filters out empty lines between tasks", async () => {
        mockGenerateContentStream.mockReturnValue(
          streamChunks(["Task one\n\n\nTask two"]),
        );
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        const json = await res.json();
        expect(json.response).toEqual(["Task one", "Task two"]);
      });

      test("concatenates streamed chunks before normalizing", async () => {
        mockGenerateContentStream.mockReturnValue(
          streamChunks(["- Task ", "one\n- Task two"]),
        );
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        const json = await res.json();
        expect(json.response).toEqual(["Task one", "Task two"]);
      });

      test("returns Content-Type: application/json header", async () => {
        mockGenerateContentStream.mockReturnValue(streamChunks(["Task one"]));
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        expect(res.headers.get("Content-Type")).toBe("application/json");
      });
    });

    describe("AI model reponse error handling", () => {
      test("returns 500 with the error message on a plain Error", async () => {
        mockGenerateContentStream.mockRejectedValue(
          new Error("Network failure"),
        );
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe("Network failure");
      });

      test("returns 500 with fallback message when error message is empty", async () => {
        mockGenerateContentStream.mockRejectedValue(new Error(""));
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe("AI generation failed.");
      });

      test("parses Google SDK double-encoded error to extract status code and message", async () => {
        const inner = JSON.stringify({
          error: { code: 429, message: "Rate limit exceeded" },
        });
        const outer = JSON.stringify({ error: { code: 429, message: inner } });
        mockGenerateContentStream.mockRejectedValue(new Error(outer));
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json.error).toBe("Rate limit exceeded");
      });

      test("falls back to raw error string when inner JSON.parse throws", async () => {
        // outer.error.message is a plain string (not JSON), so JSON.parse(innerRaw) throws
        // the outer try/catch then falls back to e.message (the raw JSON string)
        const outer = JSON.stringify({
          error: { code: 401, message: "Unauthorized" },
        });
        mockGenerateContentStream.mockRejectedValue(new Error(outer));
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe(outer);
      });

      test("extracts status code from outer error object when message field is absent", async () => {
        // innerRaw is undefined (not a string) so inner stays null and outer.error.code is used
        const outer = JSON.stringify({ error: { code: 403 } });
        mockGenerateContentStream.mockRejectedValue(new Error(outer));
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error).toBe("AI generation failed.");
      });

      test("returns 500 with fallback when error is not parseable JSON", async () => {
        mockGenerateContentStream.mockRejectedValue(
          new Error("plain text error"),
        );
        const res = await POST(
          apiContext(makeRequest({ prompt: "build an app" })),
        );
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe("plain text error");
      });
    });
  });
});
