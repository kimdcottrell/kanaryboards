---
name: url-routing-and-kv
description: How URL-based task deep-linking, Deno KV persistence, task comments storage, and the Trash purge are implemented
metadata:
  type: project
---

The board lives at `/dashboard`. Tasks are URL-addressable via `/dashboard/task/:taskId` and rows via `/dashboard/row/:id` (pages under `src/pages/dashboard/`). Task routing is handled entirely client-side by React Router; the `[taskId].astro` page is a pure shell with no SSR task lookup.

**Auth-split persistence model:**
- **Unauthenticated users**: board lives in `localStorage` only (`STORAGE_KEY = "kanby-v0-1-0"`). `PUT /api/board` returns 401.
- **Authenticated users**: board saved to KV via `PUT /api/board`. Board is keyed by a UUID7 `boardId` looked up (or created) in KV under `["user_board", clerkUserId]`.
- **Demo board** (`boardId === "demo"`, landing page): never persisted anywhere.
- **Sign-in migration**: if remote has no data, the full board is read from `STORAGE_KEY` → `PUT /api/board` → KV, then the localStorage key is removed.

**Middleware (`src/middleware.ts`):** authenticated users get `getBoardIdForUser(userId)` from KV (created if missing); unauthenticated users get a 365-day UUID7 `boardId` cookie. Either way it sets `Astro.locals.boardId`. `clerkMiddleware()` runs before `boardMiddleware`.

**KV structure (`src/lib/db/kv.ts`):**
- `["user_board", userId]` → `boardId`
- `["board", boardId]` → `PersistedBoard { rows, columns, tasks }` — one blob, must stay under KV's 64KiB value limit
- `["task_comment", boardId, taskId, commentId]` → `TaskComment` — one entry per comment, deliberately outside the board blob so comments don't count toward the 64KiB limit

**Task comments (feature/notes, 2026-10):** not in reducer state. `src/components/task/comments/commentStore.ts` picks a backend mirroring the board: API (`/api/task-comments`) when signed in, localStorage (`kanby-comments-v0-1-0`, `{[taskId]: TaskComment[]}`) when signed out, in-memory for demo. Content is Lexical JSON. Edit/delete of a single comment is author-only (403 otherwise). Because comments live outside the board, every path that removes tasks must clean them up separately: `deleteTask` calls `deleteAllComments`, `DELETE /api/board` calls `deleteBoardComments`, purge deletes them per task.

**Trash purge:** Trash tasks older than 30 days are removed by `POST /api/purge-trash` (Bearer `CRON_SECRET`, scans every `["board", *]` with an atomic versionstamp check, then deletes those tasks' comments) and also client-side in `BOARD/LOAD`. As of 2026-10-07 nothing in the repo schedules the purge call — it must be wired up as an external/Deno Deploy cron.

**API routes:**
- `GET/PUT/DELETE /api/board` — auth required; GET returns 404 `{noData:true}` when empty
- `GET/POST/PATCH/DELETE /api/task-comments` — auth required; DELETE without `id` removes all comments on a task
- `POST /api/purge-trash` — cron-only, shared-secret auth
- Shared helpers `jsonResponse` / `unauthorizedResponse` in `src/lib/http/api-responses.ts` (navigations get a 302 to `/dashboard?unauthorized=1`, fetches get 401)

**How to apply:** For new KV entities, add to `src/lib/db/kv.ts` following the existing patterns and put large/unbounded data in its own keys rather than the board blob. For `boardId` resolution, always read from `Astro.locals.boardId`. When adding a new way to remove tasks/rows/columns, check whether their comments need cleanup too. See [[State architecture and types]].
