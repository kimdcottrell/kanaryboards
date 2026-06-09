import { defineMiddleware, sequence } from "astro:middleware";
import { clerkMiddleware } from "@clerk/astro/server";
import { createId } from "@lib/uuid.ts";
import { getBoardIdForUser, setBoardIdForUser } from "@lib/kv.ts";

const boardMiddleware = defineMiddleware(async (context, next) => {
  const { userId } = context.locals.auth();

  if (userId) {
    let boardId = await getBoardIdForUser(userId);
    if (!boardId) {
      boardId = createId();
      await setBoardIdForUser(userId, boardId);
    }
    context.locals.boardId = boardId;
    return next();
  }

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

export const onRequest = sequence(clerkMiddleware(), boardMiddleware);
