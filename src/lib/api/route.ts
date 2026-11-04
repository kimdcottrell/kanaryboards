import type { APIContext, APIRoute } from "astro";
import { authorizeCli } from "@lib/api/cli-auth.ts";
import { jsonResponse, unauthorizedResponse } from "@lib/http/api-responses.ts";

// Every /api/v1/* handler is built with one of sessionRoute, cliRoute or
// publicRoute, which declares how the caller is authenticated. Handlers throw
// HttpError for any non-2xx answer instead of returning Response unions.

type RouteParams = Record<string, string | undefined>; // Astro's `Params`
// Astro's default Props. Not Record<string, never>: function params are
// checked contravariantly, so that would make `satisfies APIRoute` fail.
// deno-lint-ignore no-explicit-any
type Props = Record<string, any>;

export type Caller = { userId: string; boardId: string };

// A string body is sent as {error: body}.
export class HttpError extends Error {
  constructor(readonly status: number, readonly body: string | object) {
    super(typeof body === "string" ? body : `HTTP ${status}`);
  }
}

type Handler<P extends RouteParams, C> = (
  context: APIContext<Props, P>,
  caller: C,
) => Response | Promise<Response>;

async function run<P extends RouteParams, C>(
  context: APIContext<Props, P>,
  authorize: (
    context: APIContext<Props, P>,
  ) => C | Response | Promise<C | Response>,
  handler: Handler<P, C>,
): Promise<Response> {
  try {
    const caller = await authorize(context);
    if (caller instanceof Response) return caller;
    return await handler(context, caller);
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    return jsonResponse(
      typeof error.body === "string" ? { error: error.body } : error.body,
      error.status,
    );
  }
}

// A Clerk session (the web app). src/middleware.ts resolves locals.boardId
// for every signed-in session, so a missing one is logged as a bug.
function authorizeSession({ locals, request }: APIContext): Caller | Response {
  const { userId } = locals.auth();
  if (!userId) return unauthorizedResponse(request);
  const boardId = locals.boardId;
  if (!boardId) {
    console.error({
      event: `Rejected ${request.method} ${
        new URL(request.url).pathname
      }: locals.boardId missing despite passing the auth gate`,
      auth: locals.auth(),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return { userId, boardId };
}

// One builder per auth mode, each generic only on P. A single
// defineRoute<P, A>(auth, …) can't work: TS doesn't infer some type arguments
// while others are given, so defineRoute<Params>("session", …) would widen A
// and make the caller `Caller | undefined`.
export function sessionRoute<P extends RouteParams = RouteParams>(
  handler: Handler<P, Caller>,
): APIRoute<Props, P> {
  return (context) => run(context, authorizeSession, handler);
}

// A Clerk OAuth access token (the kanby CLI); see cli-auth.ts.
export function cliRoute<P extends RouteParams = RouteParams>(
  handler: Handler<P, Caller>,
): APIRoute<Props, P> {
  return (context) => run(context, authorizeCli, handler);
}

// No login. Routes guarded some other way (e.g. a shared secret) check it in
// the handler.
export function publicRoute<P extends RouteParams = RouteParams>(
  handler: Handler<P, undefined>,
): APIRoute<Props, P> {
  return (context) => run(context, () => undefined, handler);
}
