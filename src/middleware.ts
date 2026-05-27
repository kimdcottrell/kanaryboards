import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  let boardId = context.cookies.get("boardId")?.value;
  if (!boardId) {
    boardId = crypto.randomUUID();
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
