import { getBoard } from "@lib/db/kv.ts";
import type { PersistedBoard } from "@lib/db/kv.ts";
import type { Client } from "@lib/api/fields.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { liveBoard } from "@lib/api/board-ops.ts";

// Request/response plumbing shared by the /api/v1/* (kanby CLI) routes.

// The user's board as the web app shows it; empty if they have none yet.
export async function loadLiveBoard(boardId: string): Promise<PersistedBoard> {
  return liveBoard(
    await getBoard(boardId) ?? { rows: [], columns: [], tasks: [] },
  );
}

// The JSON object body, or a 400 Response.
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {
    // fall through
  }
  return jsonResponse({ error: "Invalid request body." }, 400);
}

// KV versionstamps, as (quoted) ETags.
export const toEtag = (versionstamp: string) => `"${versionstamp}"`;

export const ifMatchVersion = (request: Request) =>
  request.headers.get("If-Match")?.replace(/^"|"$/g, "") ?? null;

export function jsonWithEtag(
  body: object,
  status: number,
  versionstamp: string,
): Response {
  const response = jsonResponse(body, status);
  response.headers.set("ETag", toEtag(versionstamp));
  return response;
}

// Which rule set field validation uses: the kanby CLI sends
// `X-Kanby-Client: cli`; anything else is the web app.
export const clientOf = (request: Request): Client =>
  request.headers.get("X-Kanby-Client")?.toLowerCase() === "cli"
    ? "cli"
    : "app";
