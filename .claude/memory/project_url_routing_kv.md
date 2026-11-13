---
name: url-routing-and-kv
description: How URL-based task deep-linking, Deno KV persistence, task comments storage, and the Trash purge are implemented
metadata:
  type: project
---

The board lives at `/dashboard`. Tasks are URL-addressable via `/dashboard/task/:taskId` and rows via `/dashboard/row/:id` (pages under `src/pages/dashboard/`). Task routing is handled entirely client-side by React Router; the `[taskId].astro` page is a pure shell with no SSR task lookup.

**Auth-split persistence model:**
- **Unauthenticated users**: board lives in `localStorage` only (`STORAGE_KEY = "kanby-v0-1-0"`). `PATCH /api/v1/board` returns 401.
- **Authenticated users**: board saved to KV via `PATCH /api/v1/board`. Board is keyed by a UUID7 `boardId` looked up (or created) in KV under `["user_board", clerkUserId]`.
- **Demo board** (`boardId === "demo"`, landing page): never persisted anywhere.
- **Sign-in migration**: if remote has no data, the full board is read from `STORAGE_KEY` → `PATCH /api/v1/board` → KV, then the localStorage key is removed.

**Middleware (`src/middleware.ts`):** authenticated users get `getBoardIdForUser(userId)` from KV (created if missing); unauthenticated users get a 365-day UUID7 `boardId` cookie. Either way it sets `Astro.locals.boardId`. `clerkMiddleware()` runs before `boardMiddleware`.

**KV structure (`src/lib/db/kv.ts`):**
- `["user_board", userId]` → `boardId`
- `["row"|"column"|"task", boardId, id]` → one entry per entity (each under KV's 64KiB value limit; `PATCH /api/v1/board` rejects entries ≥65000 bytes). `getBoard` lists the three prefixes into a `PersistedBoard`.
- `["board", boardId]` → legacy single-blob board; `getBoard` migrates it to per-entity entries on first read (one atomic commit checked against the blob).
- `["board_rev", boardId]` → set in the same commit as every board write (`applyBoardChanges`, `saveEntity`, `purgeExpiredTrash`; `deleteBoard` deletes it; the legacy migration doesn't touch it). `watchBoard` watches it for SSE, and its **versionstamp is the board revision** (`getBoardRevision`, `revisionCheck`).
- `["task_comment", boardId, taskId, commentId]` → `TaskComment` — one entry per comment.

**Writes and conflicts (2026-11-13):** every board write goes through `applyBoardChanges(boardId, changes, checks?)` (partial change lists allowed; splits past 999 mutations / 750KiB, and when `checks` is given each later chunk checks `board_rev` at the previous commit's versionstamp; returns `{ok, versionstamp}`). `GET /api/v1/board` reads the revision *before* the board and sends it as ETag (`"none"` = never written); `PATCH` with `If-Match` is checked → 409 `{conflict:true}` if the board was written since; without `If-Match` it's unchecked (HeroStartForm, test-data). The PATCH also runs the `fields.ts` field rules reject-only (422 `{field,error}`, value saved as sent). Client side (`useBoardPersistence`): `revRef` advances only together with `savedRef`; on 409 `mergeConflict` keeps changes to entities whose server copy still equals `savedRef` (keys compared sorted — the zod parse reorders keys) and takes the server's version of the rest (`SaveConflictAlert` only then). The CLI's per-entity ETags: [[project-kanby-cli]].

**Task comments (feature/notes, 2026-10):** not in reducer state. `src/components/react/task/comments/commentStore.ts` picks a backend mirroring the board: API (`/api/v1/tasks/{taskId}/comments`) when signed in, localStorage (`kanby-comments-v0-1-0`, `{[taskId]: TaskComment[]}`) when signed out, in-memory for demo. Content is Lexical JSON. Edit/delete of a single comment is author-only (403 otherwise). `schema.dbml` declares `task_comments.task_id > tasks.id [delete: cascade]`, but that's design intent for a future Postgres — KV enforces nothing. Cleanup is explicit: `deleteTask` calls `deleteAllComments` (immediate); `DELETE /api/v1/board` calls `deleteBoardComments`; every other way a task leaves the board (row/column delete, expiry on load, reset) is handled by orphan sweeps — KV in the purge, localStorage via `pruneLocalComments` on signed-out board load. Do NOT add per-path cleanup or reconcile on `PATCH /api/v1/board`; the user explicitly chose the daily sweep over cleanup-on-save (2026-10-08).

**Trash purge:** `purgeExpiredTrash` in `kv.ts`, exposed as `POST /api/v1/cron/purge-trash` (Bearer `CRON_SECRET`). Migrates any legacy `["board", *]` blobs first, then for every `["task", *, *]` 30+ days in Trash: atomic versionstamp-checked delete that also bumps that board's `board_rev` (open tabs refresh; a stale tab's save of the purged task gets a 409); a task saved mid-run is skipped until the next run. Then deletes comments whose task entry is gone and whose `createdAt` is 24h+ old (grace for comments posted before their new task's autosave lands). Expired tasks are also dropped client-side in `BOARD/LOAD`. As of 2026-10-08 the cron isn't set up yet; the user plans to schedule it with `Deno.cron()` on Deno Deploy.

**API routes:**
- All routes live under `src/pages/api/v1/` (moved there 2026-11-04 on `feature/cli`). Each export is built with `sessionRoute` / `cliRoute` / `publicRoute` from `src/lib/api/route.ts` and ends in `satisfies APIRoute<…, Params>`; handlers throw `HttpError` for non-2xx. Body helpers (`readJson`, `readJsonObject`, `parseBody`) are in `src/lib/api/request.ts`.
- The pre-v1 URLs `/api/board`, `/api/board/events`, `/api/generate-tasks`, `/api/contact` have **temporary** 307 redirects in `astro.config.mjs` `redirects`, kept for tabs and CLI builds from before the move. They are to be removed in a later release. Comments, purge-trash and test-data got no redirect.
- `GET/PATCH/DELETE /api/v1/board` — session auth; GET returns 404 `{noData:true}` when empty, ETag (board revision) on 200 and 404; PATCH takes optional `If-Match` → 200 + ETag / 409 / 422 (see above); `GET /api/v1/board/events` is the SSE stream
- `GET/POST/DELETE /api/v1/tasks/[id]/comments` (DELETE removes every comment on the task) and `PATCH/DELETE /api/v1/tasks/[id]/comments/[commentId]` (author only, else 403) — session auth, full task ids
- `POST /api/v1/cron/purge-trash` — cron-only, shared-secret auth
- Shared helpers `jsonResponse` / `unauthorizedResponse` in `src/lib/http/api-responses.ts` (navigations get a 302 to `/dashboard?unauthorized=1`, fetches get 401)

**How to apply:** For new KV entities, add to `src/lib/db/kv.ts` following the existing patterns and put large/unbounded data in its own keys. Any new code that writes board entities must bump `["board_rev", boardId]` in the same commit (ideally by going through `applyBoardChanges`), or open tabs won't refresh and stale saves won't be caught. For `boardId` resolution, always read from `Astro.locals.boardId`. When adding a new way to remove tasks/rows/columns, check whether their comments need cleanup too. See [[State architecture and types]].
