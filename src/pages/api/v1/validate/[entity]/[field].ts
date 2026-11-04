export const prerender = false;

import type { APIRoute } from "astro";
import { HttpError, publicRoute } from "@lib/api/route.ts";
import { fieldValidator, isEntity } from "@lib/api/fields.ts";
import { clientOf, readJsonObject } from "@lib/api/request.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

type Params = { entity: string; field: string };

// Checks one field, e.g. POST /api/v1/validate/task/title {"value": " Ship it "}
// -> 200 {"ok": true, "value": "Ship it"}, or 422 {"error": "..."}. Nothing is
// read or saved, so no login is needed. The kanby CLI calls this as the user
// answers each prompt, with `X-Kanby-Client: cli` for its own rules.
export const POST = publicRoute<Params>(async ({ params, request }) => {
  const { entity, field } = params;
  const validate = isEntity(entity)
    ? fieldValidator(entity, field, clientOf(request))
    : undefined;
  if (!validate) throw new HttpError(404, "Unknown field.");
  const body = await readJsonObject(request);
  const result = validate(body.value);
  if (!result.ok) throw new HttpError(422, result.error);
  return jsonResponse({ ok: true, value: result.value }, 200);
}) satisfies APIRoute<Record<string, unknown>, Params>;
