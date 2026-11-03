export const prerender = false;

import type { APIRoute } from "astro";
import { isEntity, validateFields } from "@lib/api/fields.ts";
import { clientOf, readJsonObject } from "@lib/api/v1-http.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

// Checks every field in the body at once, e.g. POST /api/v1/validate/row
// {"title": " Q3 "} -> 200 {"ok": true, "values": {"title": "Q3"}}, or 422
// {"error": "...", "field": "title"}. Unknown fields are ignored. The web app
// calls this before each save; nothing is read or saved.
export const POST: APIRoute = async ({ params, request }) => {
  const { entity } = params;
  if (!isEntity(entity)) return jsonResponse({ error: "Unknown entity." }, 404);
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const result = validateFields(entity, body, clientOf(request));
  if (!result.ok) {
    return jsonResponse({ error: result.error, field: result.field }, 422);
  }
  return jsonResponse({ ok: true, values: result.values }, 200);
};
