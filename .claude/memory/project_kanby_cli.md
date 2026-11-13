---
name: project-kanby-cli
description: kanby CLI (cli/) + /api/v1 REST API — architecture, user-chosen design decisions, conflict model shared with the web app, file map, commands, test/compile tasks, gotchas; updated 2026-11-13
metadata:
  type: project
---

`kanby` is a paid-only terminal CLI for rows/tasks, talking to `/api/v1/*` with a Clerk OAuth token. Built 2026-11-02/03, committed on branch `feature/cli` (args parsing moved from commander to `@bomb.sh/args` in 1bcc66f; prompts are `@clack/prompts`). Login/Clerk details: [[project-kanby-cli-login]].

**Commands:** `user login|logout|whoami`, `row list|create|edit --id <id>`, `task list [--row <id>]|create|edit --id <id>`; every command and group has `--help`. Ids are flags because `@bomb.sh/args` turns a positional starting with a digit into a number.
Run: `deno task cli <args>` · tests: `deno task cli:test` · binary: `deno task cli:compile` → `cli/bin/kanby` (gitignored).

**Decisions the user made (don't relitigate):**
- Paid gate is a stub: `isPaidUser()` in `src/lib/api/billing.ts` returns true (TODO Clerk Billing; `has({plan})` is always false for OAuth tokens → must use `clerkClient.billing.getUserBillingSubscription`). Lives in its own module so tests can `vi.mock` it.
- "Check each field individually" = validate-only endpoint `POST /api/v1/validate/{task|row}/{field}` → 200 `{ok,value}` / 422 `{error}`; one POST/PATCH saves at the end.
- Short ids = **last 8 chars** of UUIDv7 (prefix is a timestamp, not unique). `findByRef` takes full id or ≥6-char suffix; 409 if ambiguous.
- Edit mode: empty Enter keeps current value; create: empty required field (title) errors and re-prompts.

**Conflict model (reworked 2026-11-13, see [[url-routing-and-kv]]):** one write primitive for both clients — `applyBoardChanges(boardId, changes, checks?)` in `kv.ts`; `saveEntity` is a thin wrapper around it.
- CLI: GET `/api/v1/{rows,tasks}/[id]` returns the entity's KV versionstamp as ETag; PATCH requires `If-Match` (428 without, 409 if that entity changed). `editTask` keeps the ETag from the start of the prompt session; `saveTaskEdit` (exported for `cli/tests/task.test.ts`) turns a 409 into "This task changed while you were editing. Re-run …". Only that entity counts.
- Web app: board-wide check on `["board_rev", boardId]`'s versionstamp (ETag on GET `/api/v1/board`, `If-Match` on PATCH). On 409 it merges and resends — user chose this over plain server-wins. A web tab's colliding save can no longer overwrite a CLI edit; open tabs see CLI writes live via SSE.
- Possible false CLI 409: the web app re-saving the task unchanged (post-load normalization or merge resend) bumps its versionstamp. Accepted.

**Server files:** `src/lib/api/cli-auth.ts` (`authorizeCli`: `locals.auth({acceptsToken:"oauth_token"})`, 401/402, resolves/creates boardId since middleware only does it for session tokens), `fields.ts` (per-field validators shared by validate, the CLI's POST/PATCH and — reject-only — the web app's bulk `PATCH /api/v1/board`; exports `checklistItemSchema`; lookup guarded with `Object.hasOwn`), `board-ops.ts` (liveBoard mirrors `load()` filtering; new task top of cell; moved task end of cell; checklist append; first row on empty board also writes `reset().columns`), `request.ts` (body readers, ETag helpers incl. board-revision `NO_REVISION`/`revisionEtag`/`ifMatchRevision`, `loadLiveBoard`); CLI routes in `src/pages/api/v1/` (me, columns, rows, rows/[id], tasks, tasks/[id], validate/[entity]/[field]) built with `cliRoute` from `route.ts`. `src/env.d.ts` `Locals.auth` widened to accept `{acceptsToken}`.
- Descriptions are Lexical JSON; `src/lib/lexical.ts` has `plainTextToLexical`/`lexicalToPlainText`. CLI only sends description when changed (round trip drops web formatting). Not yet verified that CLI-written descriptions render in Luthor editor.
- AI checklist reuses existing `POST /api/v1/ai/task-titles` (unauthenticated).

**CLI files:** `cli/main.ts`, `args.ts` (`@bomb.sh/args`, help text), `config.ts`, `auth.ts`, `api.ts` (Bearer; 401/402 messages; `ApiError`), `prompts.ts` (`@clack/prompts` wrappers: `askText`, `answer`, `waiting`, `printTable`, checklist parse/format), `commands/{user,row,task}.ts`, `errors.ts`, tests `cli/tests/*.test.ts` (node:assert; `task.test.ts` logs in via `cli/tests/fixtures/config/kanby/credentials.json` + `XDG_CONFIG_HOME` and stubs `fetch`; `cli:test` has no `--allow-write`). Row colors hardcoded as labels in `commands/row.ts` (CLI can't import `@components` aliases); server maps label→value. The CLI imports types from `../../src/lib/types.ts` by relative path — that file must stay import-free.

**Gotchas hit:**
- CLI npm deps must be in package.json (lint rule `no-import-prefix` rejects inline `npm:`).
- `deno compile` with root config embeds all node_modules (1.25GB) → `cli/deno.jsonc` (imports map, `nodeModulesDir: none`, `lock: false`) is passed via `--config` only for compile (~105MB).
- Don't output binary to `dist/` — `deno task build` wipes it.
- `deno check` on a single API file reports `Locals.auth` missing — pre-existing artifact; repo-wide `deno check` and `astro check` pass.
- Tests: `tests/vitest/pages/api-v1.test.ts` (in-memory KV via `_setKvForTest`; also web-app-vs-CLI revision cases), `tests/vitest/modules/cli-board-ops.test.ts`, `tests/vitest/modules/db/kv.test.ts`, `cli/tests/`.
