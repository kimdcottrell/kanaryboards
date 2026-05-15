---
name: feedback_deno_only
description: Never use npm, npx, yarn, pnpm, bun, node, or python3 inside the app container — Deno is the only JS runtime; python3 does not exist
metadata:
  type: feedback
---

Only use `deno` commands inside the app container. `npm`, `npx`, `yarn`, `pnpm`, `bun`, standalone `node`, `python`, and `python3` are NOT installed and will fail.

**Why:** The devcontainer intentionally ships only Deno 2.x. python3 does not exist in this project — attempting to call it will immediately error.

**How to apply:** Any time you need to run a JS/TS script, install a dependency, or execute a project task, use `deno run`, `deno task`, or `deno add`. `npx` does not exist — use these alternatives in order of preference:
1. `deno task <package>` — if a matching task is defined in deno.jsonc
2. `deno run --allow-all <package>` — for a local or remote script
3. `deno run --allow-all npm:<package>` — as a last resort for npm-hosted executables For any scripting or data-manipulation task where you might reach for python3, prefer plain bash commands (awk, sed, grep, jq, curl, etc.) instead. Never use npm/npx, any other package manager, or python3. See [[reference_environment]] for the full tooling list.
