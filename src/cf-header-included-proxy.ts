// proxy.ts
import "../dist/server/entry.mjs"; // starts Astro's Deno.serve on 8085 inside the container

const DENO_ADAPTER_BACKEND = "http://localhost:8085";

import { securityHeaders } from "./lib/http/security-headers.ts";
import { PUBLIC_CACHE_CONTROL } from "./lib/http/cache-headers.ts";

const proxy = Deno.serve({ port: 8080, hostname: "0.0.0.0" }, async (req) => {
  const url = new URL(req.url);
  const target = new URL(url.pathname + url.search, DENO_ADAPTER_BACKEND);

  const headers = new Headers(req.headers);
  headers.delete("host");

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.body) {
    init.body = req.body;
    init.duplex = "half";
  }

  const backendResp = await fetch(target, init);

  const respHeaders = new Headers(backendResp.headers);
  respHeaders.delete("content-encoding");
  respHeaders.delete("content-length");
  for (const [name, value] of Object.entries(securityHeaders)) {
    respHeaders.delete(name);
    respHeaders.set(name, value);
  }
  respHeaders.delete("cache-control");
  respHeaders.set("cache-control", PUBLIC_CACHE_CONTROL);

  return new Response(backendResp.body, {
    status: backendResp.status,
    statusText: backendResp.statusText,
    headers: respHeaders,
  });
});

// Graceful shutdown, coordinating both servers
Deno.addSignalListener("SIGINT", async () => {
  const { stop } = await import("../dist/server/entry.mjs");
  await stop();
  await proxy.shutdown();
  Deno.exit(0);
});
