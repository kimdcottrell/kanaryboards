import { useRef } from "react";

// Exposes a per-component render count via a `data-render-count` attribute
// so Playwright tests can assert on render isolation. Only included in
// non-production builds.
export function useRenderCount(): number | undefined {
  if (
    import.meta.env.DENO_TIMELINE !== undefined &&
    import.meta.env.DENO_TIMELINE !== "production"
  ) return undefined;

  const count = useRef(0);
  count.current += 1;
  return count.current;
}
