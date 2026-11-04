export const prerender = false;

import type { APIRoute } from "astro";
import { HttpError, publicRoute } from "@lib/api/route.ts";
import { isEntity, validateFields } from "@lib/api/fields.ts";
import { clientOf, readJsonObject } from "@lib/api/request.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

type Params = { entity: string };

// Checks every field in the body at once, e.g. POST /api/v1/validate/row
// {"title": " Q3 "} -> 200 {"ok": true, "values": {"title": "Q3"}}, or 422
// {"error": "...", "field": "title"}. Unknown fields are ignored. The web app
// calls this before each save; nothing is read or saved.
export const POST = publicRoute<Params>(async ({ params, request }) => {
  const { entity } = params;
  if (!isEntity(entity)) throw new HttpError(404, "Unknown entity.");
  const body = await readJsonObject(request);
  const result = validateFields(entity, body, clientOf(request));
  if (!result.ok) {
    throw new HttpError(422, { error: result.error, field: result.field });
  }
  return jsonResponse({ ok: true, values: result.values }, 200);
}) satisfies APIRoute<Record<string, unknown>, Params>;
