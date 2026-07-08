export const prerender = false;

import type { APIRoute } from "astro";
import type { APIContext } from "astro";

import { GoogleGenAI } from "@google/genai";

interface GenerateTasksBody {
  prompt?: string;
  maxTasks?: number;
}

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

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }: APIContext) => {
  if (!ai) {
    return jsonResponse({ error: "AI service is not configured." }, 503);
  }

  let body: GenerateTasksBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const prompt = String(body.prompt || "").trim();
  const maxTasks = Number(body.maxTasks ?? 10) || 10;

  if (!prompt) {
    return jsonResponse({ error: "Missing prompt." }, 400);
  }

  const systemPrompt =
    `You are an AI assistant that generates concise task titles for a kanban board. The task titles should return as a simple list, one task per line. Simpler boards may have ${
      maxTasks / 2
    } tasks, while more complex boards may have up to ${maxTasks} tasks.`;
  const cleanedPrompt = `Create ${
    maxTasks / 2
  } to ${maxTasks} task titles for the following project description: ${prompt}`;

  try {
    let fullText = "";
    const response = await ai.models.generateContentStream({
      model: apiModel,
      contents: cleanedPrompt,
      config: { systemInstruction: systemPrompt },
    });
    for await (const chunk of response) {
      fullText += chunk.text;
    }
    return jsonResponse({ response: normalizeTaskLines(fullText) }, 200);
  } catch (e) {
    console.error("generate-tasks error:", e);

    let status = 500;
    let message = "AI generation failed.";
    try {
      const outer = JSON.parse((e as Error).message);
      // Google SDK double-encodes the API error: outer.error.message is itself a JSON string
      const innerRaw = outer?.error?.message ?? outer?.message;
      const inner = typeof innerRaw === "string" ? JSON.parse(innerRaw) : null;
      status = inner?.error?.code ?? outer?.error?.code ?? outer?.code ?? 500;
      message = inner?.error?.message ?? outer?.error?.message ??
        outer?.message ?? message;
    } catch {
      message = (e as Error).message || message;
    }

    return jsonResponse({ error: message }, status);
  }
};
