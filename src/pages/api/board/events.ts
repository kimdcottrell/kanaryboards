export const prerender = false;

import type { APIRoute } from "astro";
import { watchBoard } from "@lib/db/kv.ts";
import { jsonResponse, unauthorizedResponse } from "@lib/http/api-responses.ts";

const encoder = new TextEncoder();
const CHANGE = encoder.encode("data: change\n\n");
const PING = encoder.encode(": ping\n\n");
// Proxies close idle streams (Cloudflare after 100s); a comment keeps it open.
const PING_INTERVAL_MS = 30_000;

// Server-Sent Events: "change" whenever the board is written (by this tab,
// another device, or the CLI), plus once on connect to cover writes made
// between the tab's GET /api/board and this stream opening. The tab refetches
// the board on each one (see effects/useBoardPersistence.ts).
export const GET: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return unauthorizedResponse(request);
  const boardId = locals.boardId;
  if (!boardId) {
    console.error({
      event:
        "Rejected GET /api/board/events: locals.boardId missing despite passing the auth gate",
      auth: locals.auth(),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const reader = (await watchBoard(boardId)).getReader();
  let ping: ReturnType<typeof setInterval>;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      ping = setInterval(() => controller.enqueue(PING), PING_INTERVAL_MS);
    },
    async pull(controller) {
      const { done } = await reader.read();
      if (done) {
        clearInterval(ping);
        controller.close();
      } else {
        controller.enqueue(CHANGE);
      }
    },
    cancel() {
      clearInterval(ping);
      return reader.cancel();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
};
