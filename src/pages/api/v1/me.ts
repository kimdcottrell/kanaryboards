export const prerender = false;

import type { APIRoute } from "astro";
import { clerkClient } from "@clerk/astro/server";
import { authorizeCli } from "@lib/api/cli-auth.ts";
import { jsonResponse } from "@lib/http/api-responses.ts";

// `kanby user whoami`.
export const GET: APIRoute = async (context) => {
  const auth = await authorizeCli(context);
  if (auth instanceof Response) return auth;
  const user = await clerkClient(context).users.getUser(auth.userId);
  return jsonResponse({
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    name: user.fullName,
  }, 200);
};
