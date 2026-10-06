export function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Reject an unauthenticated request. A top-level browser navigation (someone
// typing an /api/* URL into the address bar) is bounced to the dashboard's
// friendly "you must be logged in" alert; every programmatic fetch — how the
// app actually calls these endpoints — gets a plain 401.
export function unauthorizedResponse(request: Request): Response {
  if (request.headers.get("Sec-Fetch-Mode") === "navigate") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard?unauthorized=1",
        "x-authenticated": "false",
      },
    });
  }
  return jsonResponse({ error: "Unauthorized" }, 401);
}
