export const prerender = false;

import type { APIRoute } from "astro";
import type { APIContext } from 'astro';

const getDeepseekApiKey = () => {
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    return (
      Deno.env.get("SCITELY_API_KEY") ||
      Deno.env.get("OPENAI_API_KEY")
    );
  }

  return undefined;
};

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
    .filter(Boolean)
    .slice(0, 10);

interface GenerateTasksBody {
  prompt?: string;
  maxTasks?: number;
}

interface DeepseekResponse {
  choices?: Array<{
    text?: string;
    message?: {
      content?: string;
    };
  }>;
  outputs?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}

const extractResponseText = (data: DeepseekResponse) => {
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    if (typeof choice?.message?.content === "string") {
      return choice.message.content;
    }
    if (typeof choice?.text === "string") {
      return choice.text;
    }
  }

  if (Array.isArray(data.outputs) && data.outputs.length > 0) {
    const output = data.outputs[0];
    if (Array.isArray(output.content)) {
      return output.content
        .map((chunk) => chunk?.text)
        .filter((text): text is string => typeof text === "string")
        .join("\n");
    }
  }

  return "";
};

// export async function post({ request }: { request: Request }) {
export const POST: APIRoute = async ({ request }: APIContext) => {
  const body = (await request.json()) as GenerateTasksBody;
  const prompt = String(body.prompt || "").trim();
  const maxTasks = Number(body.maxTasks ?? 10) || 10;

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Missing prompt." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = getDeepseekApiKey();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing Deepseek/SciTely API key." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requestBody = {
    model: "deepseek-v3.2",
    messages: [
      {
        role: "system",
        content:
          `You are an AI assistant that generates concise task titles for a kanban board. The task titles should return as a simple list, one task per line. Simpler boards may have ${maxTasks/2} tasks, while more complex boards may have up to ${maxTasks} tasks.`,
      },
      {
        role: "user",
        content: `Create ${maxTasks/2} to ${maxTasks} task titles for the following project description: ${prompt}`,
      },
    ],
    temperature: 0.8,
    max_tokens: 320,
  };

  const response = await fetch("https://api.scitely.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: errorText }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const responseData = (await response.json()) as DeepseekResponse;
  const text = extractResponseText(responseData).trim();

  if (!text) {
    return new Response(
      JSON.stringify({ error: "Unable to parse model response.", responseData }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const tasks = normalizeTaskLines(text).slice(0, maxTasks);

  return new Response(JSON.stringify({ tasks }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
