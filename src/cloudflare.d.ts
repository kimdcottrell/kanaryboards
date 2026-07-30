// The workerd types this app actually uses.
//
// `wrangler types` is run with `--include-runtime=false` (see the
// `generate-types` script) so that worker-configuration.d.ts contains only the
// generated `Env` interface. Its runtime types are ambient and redeclare
// `Element`, `Response`, `fetch`, ... which merge with lib.dom — that breaks
// every DOM-typed file in the project: `Element.setAttribute` starts returning
// `Element`, so `HTMLSelectElement` no longer satisfies testing-library's
// `T extends Element`, and `Response.json()` degrades to `unknown`.
//
// Worker-runtime code is still checked against the real workerd types by
// tests/workers, which has its own tsconfig outside this program.

interface KVNamespace {
  get(key: string): Promise<string | null>;
  get<T>(key: string, type: "json"): Promise<T | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Fetcher {
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
