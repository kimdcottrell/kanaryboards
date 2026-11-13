export const prerender = false;

import type { APIRoute } from "astro";
import { clerkClient } from "@clerk/astro/server";
import { cliRoute } from "@lib/api/route.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";
import type { Me } from "@lib/types.ts";

// `kanby user whoami`.
export const GET = cliRoute(async (context, { userId }) => {
  const user = await clerkClient(context).users.getUser(userId);
  return jsonResponse(
    {
      userId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      name: user.fullName,
    } satisfies Me,
    200,
  );
}) satisfies APIRoute;
