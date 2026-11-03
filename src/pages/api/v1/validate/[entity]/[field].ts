export const prerender = false;

import type { APIRoute } from "astro";
import { authorizeCli } from "@lib/api/cli-auth.ts";
import { fieldValidators } from "@lib/api/fields.ts";
import { loadLiveBoard, readJsonObject } from "@lib/api/v1-http.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

// Checks one field as the kanby CLI's interactive prompts collect it, e.g.
// POST /api/v1/validate/task/title {"value": "  Ship it "} ->
// 200 {"ok": true, "value": "Ship it"}, or 422 {"error": "..."}. Nothing is
// saved; the CLI sends every answer at once to the rows/tasks routes.
export const POST: APIRoute = async (context) => {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const { entity, field } = context.params;
  const validators = entity === "task" || entity === "row"
    ? fieldValidators[entity]
    : undefined;
  const validate = validators && field && Object.hasOwn(validators, field)
    ? validators[field]
    : undefined;
  if (!validate) return jsonResponse({ error: "Unknown field." }, 404);
  const body = await readJsonObject(context.request);
  if (body instanceof Response) return body;
  const result = validate(body.value, await loadLiveBoard(auth.boardId));
  if (!result.ok) return jsonResponse({ error: result.error }, 422);
  return jsonResponse({ ok: true, value: result.value }, 200);
};
