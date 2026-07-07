import { defineMiddleware, sequence } from "astro/middleware";
import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { createId } from "@lib/uuid.ts";
import { getBoardIdForUser, setBoardIdForUser } from "@lib/kv.ts";

const isProtectedRoute = createRouteMatcher(["/api/board(.*)"]);

export const protectedRequestMiddleware = clerkMiddleware(
  async (auth, context, next) => {
    const { isAuthenticated, userId } = auth();

    if (!isAuthenticated && isProtectedRoute(context.request)) {
      console.debug({
        event:
          `Unauthorized access to ${context.request.url} blocked and handled`,
        ip: context.clientAddress,
        method: context.request.method,
        url: context.request.url,
        headers: Object.fromEntries(context.request.headers),
      });
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/dashboard?unauthorized=1",
          "x-authenticated": "false",
        },
      });
    }

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

const boardMiddleware = defineMiddleware((context, next) => {
  if (context.locals.boardId) return next();

  // Unauthenticated: use a persistent cookie-based boardId
  let boardId = context.cookies.get("boardId")?.value;
  if (!boardId) {
    boardId = createId();
    context.cookies.set("boardId", boardId, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  context.locals.boardId = boardId;
  return next();
});

export const onRequest = sequence(
  protectedRequestMiddleware,
  boardMiddleware,
);
