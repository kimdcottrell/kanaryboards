import { z } from "astro/zod";
import { getBoard } from "@lib/db/kv.ts";
import type { PersistedBoard } from "@lib/types.ts";
import type { Client } from "@lib/api/fields.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import { liveBoard } from "@lib/api/board-ops.ts";
import { HttpError } from "@lib/api/route.ts";

// Request/response plumbing shared by the /api/v1/* routes. Each reader
// throws HttpError(400) for a body it can't use (see route.ts).

// The user's board as the web app shows it; empty if they have none yet. Not
// in board-ops.ts, which the web app's client bundle imports.
export async function loadLiveBoard(boardId: string): Promise<PersistedBoard> {
  return liveBoard(
    await getBoard(boardId) ?? { rows: [], columns: [], tasks: [] },
  );
}

const invalidBody = () => new HttpError(400, "Invalid request body.");

// The parsed JSON body, whatever its shape.
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw invalidBody();
  }
}

// The JSON body, which must be an object.
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const body = await readJson(request);
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  throw invalidBody();
}

// The JSON body, checked against `schema`. A rejected body is logged (with
// `logContext`, e.g. the boardId) since the app itself never sends one.
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
  logContext: Record<string, unknown> = {},
): Promise<z.infer<S>> {
  const reject = (issues: unknown) => {
    console.error({
      event: `Rejected ${request.method} ${
        new URL(request.url).pathname
      }: invalid request body`,
      ...logContext,
      issues,
    });
    return invalidBody();
  };
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw reject(String(error));
  }
  const result = schema.safeParse(body);
  if (!result.success) throw reject(result.error.issues);
  return result.data;
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
