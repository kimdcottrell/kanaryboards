// @vitest-environment node
import { describe, expect, test } from "vitest";
import { parse } from "@jsr/std__yaml";
import specText from "../../../docs/api/openapi.yaml?raw";

// docs/api/openapi.yaml must list exactly the routes and methods under
// src/pages/api, each with the security its auth builder (route.ts) implies.

type Operation = {
  security?: Record<string, string[]>[];
  responses?: Record<string, unknown>;
};
type Spec = { paths: Record<string, Record<string, Operation>> };

const spec = parse(specText) as Spec;
const sources = import.meta.glob<string>("/src/pages/api/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

const METHODS = ["get", "post", "put", "patch", "delete"];
const USER_SCHEMES: Record<string, string[]> = {
  sessionRoute: ["clerkSession"],
  cliRoute: ["cliOAuth"],
  publicRoute: [],
};

// "/src/pages/api/v1/rows/[id].ts" -> "/api/v1/rows/{id}"
const toPath = (file: string) =>
  file.replace(/^\/src\/pages/, "").replace(/\.ts$/, "")
    .replace(/\/index$/, "").replace(/\[(\w+)\]/g, "{$1}");

const routes = Object.entries(sources).flatMap(([file, source]) =>
  [...source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE) = (\w+)/g)]
    .map(([, method, builder]) => ({
      key: `${method} ${toPath(file)}`,
      builder,
    }))
);

const documented = Object.entries(spec.paths).flatMap(([path, item]) =>
  Object.keys(item).filter((k) => METHODS.includes(k))
    .map((method) => `${method.toUpperCase()} ${path}`)
);

const operation = (key: string) => {
  const [method, path] = key.split(" ");
  return spec.paths[path]?.[method.toLowerCase()];
};

describe("docs/api/openapi.yaml", () => {
  test("documents every route, and nothing else", () => {
    const inCode = routes.map((r) => r.key).sort();
    expect(inCode.length).toBeGreaterThan(0);
    expect(documented.sort()).toEqual(inCode);
  });

  test.each(routes)("$key matches its $builder", ({ key, builder }) => {
    expect(Object.keys(USER_SCHEMES)).toContain(builder);
    const op = operation(key);
    if (!op) return; // reported by the coverage test
    expect(op.security, "security must be explicit").toBeDefined();
    const schemes = op.security!.flatMap(Object.keys)
      .filter((s) => s === "clerkSession" || s === "cliOAuth");
    expect(schemes).toEqual(USER_SCHEMES[builder]);
    if (builder === "cliRoute") expect(op.responses).toHaveProperty("402");
  });
});
