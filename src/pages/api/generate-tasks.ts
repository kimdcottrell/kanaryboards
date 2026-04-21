export const prerender = false;

import type { APIRoute } from "astro";
import type { APIContext } from 'astro';

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
        .trim(),
    )
    .filter(Boolean);

let ERRORS: Array<{ devMessage?: Error, message: Error }> = []

const getLastErrorMessage = (e: Array<{ devMessage?: Error, message: Error }>) => {
  if (import.meta.env.MODE == "development") {
    return e[e.length - 1]?.devMessage || e[e.length - 1]?.message;
  }
  return e[e.length - 1]?.message;
}

const apiKey = import.meta.env.GOOGLE_AI_STUDIO_KEY

if (apiKey === undefined) {
  ERRORS = [{
    devMessage: new Error("GOOGLE_AI_STUDIO_KEY is not set in environment variables."),
    message: new Error("Problem connecting to AI model. Please contact support.")
  }];
  console.error(getLastErrorMessage(ERRORS));
}

const ai = new GoogleGenAI({
  vertexai: false,
  apiVersion: 'v1beta',
  apiKey: apiKey,
});

export const POST: APIRoute = async ({ request }: APIContext) => {

  const body: GenerateTasksBody = await request.json();
  const prompt = String(body.prompt || "").trim();
  const maxTasks = Number(body.maxTasks ?? 10) || 10;

  if (!prompt) {

    return new Response(JSON.stringify({ error: "Missing prompt." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `You are an AI assistant that generates concise task titles for a kanban board. The task titles should return as a simple list, one task per line. Simpler boards may have ${maxTasks / 2} tasks, while more complex boards may have up to ${maxTasks} tasks.`;
  const cleanedPrompt = `Create ${maxTasks / 2} to ${maxTasks} task titles for the following project description: ${prompt}`;

  try {
    let fullText = '';

    if (import.meta.env.MODE !== "development") {
      const response = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: cleanedPrompt,
        config: { systemInstruction: systemPrompt },
      });
      for await (const chunk of response) {
        fullText += chunk.text;
      }
    } else {
      await new Promise(r => setTimeout(r, 2000));
      console.log("Responding with simulated task list...");
      fullText = 'Clear mattress surface\nIdentify sheet orientation\nSecure first corner\nHook diagonal corner\nAttach remaining corners\nTuck sides under mattress\nSmooth surface wrinkles';
    }

    return new Response(JSON.stringify({ response: normalizeTaskLines(fullText) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const parsedError = JSON.parse(JSON.parse(e.message).error.message);
    console.log(JSON.parse(parsedError))
    return new Response(JSON.stringify(parsedError), {
      status: e.status || 429,
      headers: { "Content-Type": "application/json" },
    });
  };
};