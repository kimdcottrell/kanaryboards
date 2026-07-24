import { defineMiddleware, sequence } from "astro/middleware";
import { clerkMiddleware } from "@clerk/astro/server";
import { createId } from "@lib/db/uuid.ts";
import { getBoardIdForUser, setBoardIdForUser } from "@lib/db/kv.ts";
import { securityHeaders } from "@lib/http/security-headers.ts";

export const protectedRequestMiddleware = clerkMiddleware(
  async (auth, context, next) => {
    const { userId } = auth();

    if (userId) {
      let boardId = await getBoardIdForUser(userId);
      if (!boardId) {
        boardId = createId();
        await setBoardIdForUser(userId, boardId);
      }
      context.locals.boardId = boardId;
    }

    return next();
  },
);

// Applied to on-demand rendered responses in production only. Kept out of dev
// so localhost isn't pinned to HTTPS by HSTS, and Vite HMR / Clerk dev mode
// (which need eval + websockets) aren't tripped up by the CSP. Static/
// prerendered responses get these same headers from server.ts instead, since
// they never run this middleware.
const securityHeadersMiddleware = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (import.meta.env.PROD) {
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.headers.set(name, value);
    }
  }
  return response;
});

export const boardMiddleware = defineMiddleware((context, next) => {
  if (context.locals.boardId) return next();

  // Unauthenticated: reuse a pre-existing boardId cookie if present, but never
  // create one here. Setting a cookie would force a Set-Cookie on every
  // anonymous response, which prevents the homepage from being cached at the
  // edge. Anonymous board state lives in localStorage, not this cookie/KV, so
  // leaving boardId unset for new anonymous visitors is safe.
  const boardId = context.cookies.get("boardId")?.value;
  if (boardId) context.locals.boardId = boardId;
  return next();
});

export const onRequest = sequence(
  securityHeadersMiddleware,
  protectedRequestMiddleware,
  boardMiddleware,
);
