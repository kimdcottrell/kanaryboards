---
name: feedback-crypto-uuid-secure-context
description: crypto.randomUUID requires HTTPS or localhost — add a fallback for non-secure contexts
metadata:
  type: feedback
---
`crypto.randomUUID()` is only available in **secure contexts** (HTTPS or `localhost`). Accessing the dev server via a network IP (e.g. `172.18.0.4`) over plain HTTP is not a secure context — `crypto.randomUUID` is `undefined` there, causing a `TypeError` at runtime.

**Why:** Discovered when debugging via Playwright browser pointed at the dev server's network IP. The error was `TypeError: crypto.randomUUID is not a function` deep in the React init chain.

**How to apply:** Always guard `crypto.randomUUID` with a fallback UUID generator. The fix in `src/components/context/constants.ts`:

```ts
export const createId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
```

Also applies to any code that calls `crypto.randomUUID()` directly in client-side code that may run in non-secure dev environments.
