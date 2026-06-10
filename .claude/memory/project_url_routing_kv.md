---
name: url-routing-and-kv
description: How URL-based task deep-linking and Deno KV persistence are implemented
metadata:
  type: project
---

Task edit modals are URL-addressable via `/task/:taskId`. Both `/` and `/task/:taskId` render the same `SPA.astro` → `BoardController` React island. There is no SSR task metadata lookup — the `[taskId].astro` page is a pure shell. Task routing is handled entirely client-side by React Router.

**Auth-split persistence model:**
- **Unauthenticated users**: board lives in `localStorage` only (`STORAGE_KEY = "kanary-boards"`). `PUT /api/board` returns 401.
- **Authenticated users**: board saved to KV via `PUT /api/board`. Board is keyed by a UUID7 `boardId` that is looked up (or created) in KV under `["user_board", clerkUserId]`.
- **Sign-in migration**: if remote has no data, the full board is read from `STORAGE_KEY` in localStorage → `PUT /api/board` → KV, then localStorage key is removed.

**Middleware (`src/middleware.ts`):**
- Authenticated users: looks up `getBoardIdForUser(userId)` from KV; creates and stores a new UUID7 `boardId` if none exists. Sets `Astro.locals.boardId`.
- Unauthenticated users: UUID7 cookie `boardId` (365-day); sets `Astro.locals.boardId`.
- Order: `clerkMiddleware()` runs first, then `boardMiddleware` (which calls `locals.auth()` to get `userId`).

**KV structure (`src/lib/kv.ts`):**
- `["user_board", userId]` → `boardId` (UUID7 string) — maps Clerk userId to board
- `["board", boardId]` → `PersistedBoard { rows, columns, tasks }` — full board blob

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

**How to apply:** When adding new entity types that need URL deep-links, use React Router `useNavigate`/`useParams` and a `useEffect` in `BoardView`. For new KV entities, add to `kv.ts` following the existing patterns. For `boardId` resolution, always read from `Astro.locals.boardId` (set by middleware).
