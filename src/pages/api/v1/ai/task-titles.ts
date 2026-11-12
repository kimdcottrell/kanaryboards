export const prerender = false;

import type { APIRoute } from "astro";

import { GoogleGenAI } from "@google/genai";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { HttpError, publicRoute } from "@lib/api/route.ts";
import { readJsonObject } from "@lib/api/request.ts";

const normalizeTaskLines = (content: string) =>
  content
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^\s*[-*+\d\.\)]+\s*/, "")
        .replace(/,$/, "")
        .trim()
    )
    .filter(Boolean);

// Read secrets at runtime via Deno.env.get(), NOT import.meta.env.
// Astro/Vite statically inlines import.meta.env.* at build time, so on Deno
// Deploy the value gets frozen in during the build — or baked as `undefined`
// when the var isn't present in the build environment — and the production
// runtime env var is ignored. Deno.env.get() is a true runtime lookup.
// (import.meta.env.MODE below is fine: MODE is a build-time constant, not a secret.)
const apiKey = Deno.env.get("GOOGLE_AI_STUDIO_KEY");
export const apiModel = Deno.env.get("GOOGLE_AI_STUDIO_MODEL") ||
  "gemini-3.1-flash-lite";

const MAX_PROMPT_LENGTH = 2000;
const MIN_TASKS = 1;
const MAX_TASKS = 30;
const AI_TIMEOUT_MS = 20_000;

if (!apiKey) {
  console.error(
    import.meta.env.MODE === "development"
      ? "GOOGLE_AI_STUDIO_KEY is not set in environment variables."
      : "Problem connecting to AI model. Please contact support.",
  );
}

const ai = apiKey
  ? new GoogleGenAI({ vertexai: false, apiVersion: "v1beta", apiKey })
  : null;

// Concise task titles for a project description; the web app and the kanby
// CLI also use them as checklist items. No login: anonymous visitors use it
// from the homepage.
export const POST = publicRoute(async ({ request }) => {
  if (!ai) throw new HttpError(503, "AI service is not configured.");

  // prompt and maxTasks are coerced below, so only the object shape is checked.
  const body = await readJsonObject(request);

  const prompt = String(body.prompt || "").trim();
  const maxTasks = Math.min(
    Math.max(Number(body.maxTasks ?? 10) || 10, MIN_TASKS),
    MAX_TASKS,
  );

  if (!prompt) {
    throw new HttpError(400, "Missing prompt.");
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new HttpError(400, "Prompt is too long.");
  }

  const systemPrompt =
    `You are an AI assistant that generates concise task titles for a kanban board. The task titles should return as a simple list, one task per line. Simpler boards may have ${
      maxTasks / 2
    } tasks, while more complex boards may have up to ${maxTasks} tasks.`;
  const cleanedPrompt = `Create ${
    maxTasks / 2
  } to ${maxTasks} task titles for the following project description: ${prompt}`;

  // Covers both the initial request and reading the stream.
  const signal = AbortSignal.timeout(AI_TIMEOUT_MS);

  try {
    let fullText = "";
    const response = await ai.models.generateContentStream({
      model: apiModel,
      contents: cleanedPrompt,
      config: { systemInstruction: systemPrompt, abortSignal: signal },
    });
    for await (const chunk of response) {
      fullText += chunk.text;
    }
    return jsonResponse({ response: normalizeTaskLines(fullText) }, 200);
  } catch (e) {
    console.error("POST /api/v1/ai/task-titles error:", e);

    let status = 500;
    let message = "AI generation failed.";
    if (signal.aborted) {
      status = 503;
      message = "AI service timed out. Please try again.";
    } else {
      try {
        const outer = JSON.parse((e as Error).message);
        // Google SDK double-encodes the API error: outer.error.message is itself a JSON string
        const innerRaw = outer?.error?.message ?? outer?.message;
        const inner = typeof innerRaw === "string"
          ? JSON.parse(innerRaw)
          : null;
        status = inner?.error?.code ?? outer?.error?.code ?? outer?.code ??
          500;
        message = inner?.error?.message ?? outer?.error?.message ??
          outer?.message ?? message;
      } catch {
        message = (e as Error).message || message;
      }
    }

    console.error({
      event: "POST /api/v1/ai/task-titles: Google AI request failed",
      model: apiModel,
      maxTasks,
      prompt: cleanedPrompt,
      status,
      message,
    });
    return jsonResponse({ error: message }, status);
  }
}) satisfies APIRoute;
