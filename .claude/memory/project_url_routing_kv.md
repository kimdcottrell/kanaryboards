---
name: url-routing-and-kv
description: How URL-based task deep-linking and Cloudflare Workers KV persistence are implemented
metadata:
  type: project
---

Task edit modals are URL-addressable via `/task/:taskId`. Both `/` and `/task/:taskId` render the same `SPA.astro` → `BoardController` React island. There is no SSR task metadata lookup — the `[taskId].astro` page is a pure shell. Task routing is handled entirely client-side by React Router.

**Auth-split persistence model:**
- **Unauthenticated users**: board lives in `localStorage` only (`STORAGE_KEY = "kanary-boards"`). `PUT /api/board` returns 401.
- **Authenticated users**: board saved to KV via `PUT /api/board`. Board is keyed by a UUID7 `boardId` that is looked up (or created) in KV under `["user_board", clerkUserId]`.
- **Sign-in migration**: if remote has no data, the full board is read from `STORAGE_KEY` in localStorage → `PUT /api/board` → KV, then localStorage key is removed.

**Middleware (`src/middleware.ts`):**
- Authenticated users: looks up `getBoardIdForUser(env.BOARD_KV, userId)`; creates and stores a new UUID7 `boardId` if none exists. Sets `Astro.locals.boardId`.
- Unauthenticated users: reuses a pre-existing `boardId` cookie if present but never creates one — a `Set-Cookie` on every anonymous response would prevent edge-caching the homepage. Anonymous board state lives in localStorage.
- Order: `clerkMiddleware()` runs first, then `boardMiddleware` (which calls `locals.auth()` to get `userId`).

**KV structure — Cloudflare Workers KV (`src/lib/db/kv.ts`), migrated from Deno KV 2026-07-30:**
- `user_board:<userId>` → `boardId` (UUID7 string) — maps Clerk userId to board
- `board:<boardId>` → `PersistedBoard { rows, columns, tasks }` — full board blob

Three differences from the Deno KV version that trip people up:
- **Keys are flat delimited strings**, not tuples. `["user_board", userId]` → `` `user_board:${userId}` ``.
- **Values are strings**, not structured clones — `JSON.stringify` on write, `kv.get(key, "json")` on read.
- **No cross-key transactions.** Deno KV's `atomic().check().delete()` has no equivalent; `src/pages/api/delete-test-data.ts` now does two sequential deletes and loses the abort-on-concurrent-modification guarantee (acceptable there, it's test-only).

Also note Workers KV is **eventually consistent** (up to ~60s global propagation), so a read straight after a write can be stale. Accepted tradeoff when choosing KV over D1.

**Passing the namespace:** every function in `kv.ts` takes a `KVNamespace` as its first argument — there is no module-level singleton (a Worker has no module-load-time env). Callers get it from `import { env } from "cloudflare:workers"` → `env.BOARD_KV`. See [[project_cloudflare_env_access]].

`PersistedBoard` no longer includes `defaultColumnNames`. `Row`, `Column`, and `Task` all include an `order: string` fractional index field. `Row` and `Column` use `title` not `name`.

**No task_meta:** `TaskMeta`, `getTaskMeta`, and the `["task_meta", taskId]` KV entries were removed. The `[taskId].astro` page does not fetch task metadata from KV — it renders the same `<SPA />` shell regardless, and task routing is client-side only.

**API routes:**
- `GET /api/board` — returns board or 404 `{noData:true}`; auth required
- `PUT /api/board` — saves board; auth required (401 otherwise)
- `DELETE /api/board` — clears board; auth required

**React routing (react-router-dom 7.x):**
- Routes: `/` and `/task/:taskId` both render `<BoardView />`
- `BoardView` has a `useEffect` watching `[boardLoaded, taskId, tasks]` — finds task and calls `startEditTask(task)`, or `navigate('/', { replace: true })` if not found

**BoardContext save snapshot:**
```ts
const boardSnapshot = { rows: state.rows, columns: state.columns, tasks: state.tasks };
```
No `defaultColumnNames`.

**How to apply:** When adding new entity types that need URL deep-links, use React Router `useNavigate`/`useParams` and a `useEffect` in `BoardView`. For new KV entities, add to `src/lib/db/kv.ts` following the existing patterns — take `KVNamespace` as the first parameter, use a `prefix:id` key, and stringify values. For `boardId` resolution, always read from `Astro.locals.boardId` (set by middleware). Test new KV code in `tests/workers/` (real simulated KV), not the jsdom pool.
