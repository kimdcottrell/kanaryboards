export const prerender = false;

import type { APIRoute } from "astro";
import { fieldValidator, isEntity } from "@lib/api/fields.ts";
import { clientOf, readJsonObject } from "@lib/api/v1-http.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

// Checks one field, e.g. POST /api/v1/validate/task/title {"value": " Ship it "}
// -> 200 {"ok": true, "value": "Ship it"}, or 422 {"error": "..."}. Nothing is
// read or saved, so no login is needed. The kanby CLI calls this as the user
// answers each prompt, with `X-Kanby-Client: cli` for its own rules.
export const POST: APIRoute = async ({ params, request }) => {
  const { entity, field } = params;
  const validate = isEntity(entity) && field
    ? fieldValidator(entity, field, clientOf(request))
    : undefined;
  if (!validate) return jsonResponse({ error: "Unknown field." }, 404);
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const result = validate(body.value);
  if (!result.ok) return jsonResponse({ error: result.error }, 422);
  return jsonResponse({ ok: true, value: result.value }, 200);
};
