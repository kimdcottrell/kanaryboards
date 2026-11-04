---
name: project-kanby-cli
description: kanby CLI (cli/) + /api/v1 REST API — architecture, user-chosen design decisions, file map, commands, test/compile tasks, known limitations, status as of 2026-11-03
metadata:
  type: project
---

`kanby` is a paid-only terminal CLI (commander.js) for rows/tasks, talking to `/api/v1/*` with a Clerk OAuth token. Built 2026-11-02/03 on branch `feature/mobile-improvements`; **uncommitted** as of 2026-11-03 (user hadn't asked to commit). Login/Clerk details: [[project-kanby-cli-login]].

**Commands:** `user login|logout|whoami`, `row list|create|edit <id>`, `task list [--row <id>]|create|edit <id>`.
Run: `deno task cli <args>` · tests: `deno task cli:test` · binary: `deno task cli:compile` → `cli/bin/kanby` (gitignored).

**Decisions the user made (don't relitigate):**
- Paid gate is a stub: `isPaidUser()` in `src/lib/api/billing.ts` returns true (TODO Clerk Billing; `has({plan})` is always false for OAuth tokens → must use `clerkClient.billing.getUserBillingSubscription`). Lives in its own module so tests can `vi.mock` it.
- "Check each field individually" = validate-only endpoint `POST /api/v1/validate/{task|row}/{field}` → 200 `{ok,value}` / 422 `{error}`; one POST/PATCH saves at the end.
- Short ids = **last 8 chars** of UUIDv7 (prefix is a timestamp, not unique). `findByRef` takes full id or ≥6-char suffix; 409 if ambiguous.
- Conflicts handled **server-side only**: GET `/api/v1/{rows,tasks}/[id]` returns KV versionstamp as ETag; PATCH requires `If-Match` (428 without, 409 if stale). Web client/BoardContext untouched → no sequence-diagram changes.
- Edit mode: empty Enter keeps current value; create: empty required field (title) errors and re-prompts.

**Why server-only conflicts:** commit c128eea moved KV to one entry per row/column/task (`[kind, boardId, id]`) and autosave PATCHes only diffs, so whole-board clobber is gone.
**How to apply:** known limitation remains — an open web tab sees CLI changes only on reload, and its later edit of the same task overwrites the CLI's (per-entity last-write-wins). Documented in `cli/README.md`.

**Server files:** `src/lib/api/cli-auth.ts` (`authorizeCli`: `locals.auth({acceptsToken:"oauth_token"})`, 401/402, resolves/creates boardId since middleware only does it for session tokens), `fields.ts` (per-field validators shared by validate + POST/PATCH; lookup guarded with `Object.hasOwn`), `board-ops.ts` (liveBoard mirrors `load()` filtering; new task top of cell; moved task end of cell; checklist append; first row on empty board also writes `reset().columns`), `request.ts` (was `v1-http.ts`; body readers + ETag helpers + `loadLiveBoard`); CLI routes in `src/pages/api/v1/` (me, columns, rows, rows/[id], tasks, tasks/[id], validate/[entity]/[field]) built with `cliRoute` from `route.ts`. `kv.ts` gained `getEntity`/`saveEntity` (atomic versionstamp check). `src/env.d.ts` `Locals.auth` widened to accept `{acceptsToken}`.
- Descriptions are Lexical JSON; `src/lib/lexical.ts` has `plainTextToLexical`/`lexicalToPlainText`. CLI only sends description when changed (round trip drops web formatting). Not yet verified that CLI-written descriptions render in Luthor editor.
- AI checklist reuses existing `POST /api/v1/ai/task-titles` (unauthenticated).

**CLI files:** `cli/main.ts`, `config.ts`, `auth.ts`, `api.ts` (Bearer; 401/402 messages; `ApiError`), `prompts.ts` (`ask`/`select`/`yesNo`/`printTable` on Deno `prompt()`), `commands/{user,row,task}.ts`, `errors.ts`, tests `*_test.ts` (node:assert). Row colors hardcoded as labels in `commands/row.ts` (CLI can't import `@components` aliases); server maps label→value.

**Gotchas hit:**
- `commander` must be in package.json devDependencies (lint rule `no-import-prefix` rejects inline `npm:`).
- `deno compile` with root config embeds all node_modules (1.25GB) → `cli/deno.jsonc` (imports map, `nodeModulesDir: none`, `lock: false`) is passed via `--config` only for compile (~105MB).
- Don't output binary to `dist/` — `deno task build` wipes it.
- `deno check` on a single API file reports `Locals.auth` missing — pre-existing artifact; repo-wide `deno check` and `astro check` pass.
- Tests: `tests/vitest/pages/api-v1.test.ts` (in-memory KV via `_setKvForTest`), `tests/vitest/modules/cli-board-ops.test.ts`, additions in `tests/vitest/modules/db/kv.test.ts`.
