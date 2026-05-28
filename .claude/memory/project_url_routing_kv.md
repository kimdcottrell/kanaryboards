---
name: url-routing-and-kv
description: How URL-based task deep-linking and Deno KV persistence are implemented
metadata:
  type: project
---
Task edit modals are URL-addressable via `/task/:taskId`. Navigating directly to that URL opens the board with the edit modal pre-opened and renders SEO meta tags server-side.

**Why:** User wanted shareable URLs for task edit views plus SEO (dynamic `<title>` per task), while keeping unauthenticated users' data private (not globally accessible in KV).

**Auth-split persistence model:**
- **Unauthenticated users**: board and task_meta live in `localStorage` only — no KV reads or writes. `PUT /api/board` returns 401. Task URLs at `/task/:taskId` render with a generic title (no KV entry to look up).
- **Authenticated users**: board saved to KV via `PUT /api/board`; task_meta written atomically alongside it. Task URLs get rich SSR titles.
- **Sign-in migration** (in `BoardContext.tsx` load effect): localStorage task_meta → `POST /api/task-meta` → KV; localStorage board → `PUT /api/board` → KV (only if remote is empty). Both localStorage keys are cleared after migration.

**Architecture:**
- `src/middleware.ts` — generates `boardId` UUID cookie on first visit; sets `Astro.locals.boardId`
- `src/lib/kv.ts` — `getBoard`, `saveBoard(boardId, data, opts?)`, `saveTaskMetas(boardId, tasks)`, `deleteBoard`, `getTaskMeta`
- `src/pages/api/board.ts` — GET returns board or 404 `{noData:true}`; PUT requires auth (401 otherwise); DELETE clears board + task_meta
- `src/pages/api/task-meta.ts` — POST writes batch task_meta entries; requires auth
- `src/components/context/constants.ts` — `createDefaultBoard()` shared by API and client; `STORAGE_KEY` and `TASK_META_STORAGE_KEY` localStorage keys
- `src/pages/task/[taskId].astro` — SSR: fetches task title from KV → sets `<title>` and `<meta description>` (falls back to "Kanary Boards" if not in KV); passes `initialTaskId` and `isAuthenticated` to React island

**KV key structure (authenticated users only):**
- `["board", boardId]` → `{ rows, columns, tasks, defaultColumnNames }`
- `["task_meta", taskId]` → `{ title, description, boardId }` (for O(1) SSR lookups)

**localStorage keys (unauthenticated users):**
- `kanary-boards` — full board snapshot `{ rows, columns, tasks, defaultColumnNames }`
- `kanary-task-meta` — `{ [taskId]: { title, description } }` map

**React routing (react-router-dom 7.x):**
- `BrowserRouter` wraps app in `BoardWrapper.jsx`
- Routes: `/` and `/task/:taskId` both render `<BoardInner />`
- `BoardInner` has a `useEffect` watching `[boardLoaded, taskId, tasks]` — once data is loaded, finds the task and calls `startEditTask(task)`, or `navigate('/', { replace: true })` if not found
- Clicking a task card: calls `startEditTask(task)` + `navigate('/task/:id')`
- Closing/saving/deleting in `TaskEditModal`: calls `navigate('/')`

**BoardContext data flow:**
- Authenticated mount: GET `/api/board` → migrate localStorage task_meta (POST `/api/task-meta`) → migrate localStorage board if remote empty (PUT `/api/board`) → `dispatch(BOARD/LOAD)`
- Unauthenticated mount: read `STORAGE_KEY` from localStorage → `dispatch(BOARD/LOAD)` with local data or `createDefaultBoard()`
- Authenticated save: debounced (500ms) PUT to `/api/board`
- Unauthenticated save: debounced write to `STORAGE_KEY` + `TASK_META_STORAGE_KEY` in localStorage

**How to apply:** When adding new entity types that need URL-based deep links, follow this pattern: add a KV meta index entry (written only for authenticated users), add an Astro SSR page for SEO with graceful null fallback, use `useNavigate` in the card component, and a `useEffect` in the inner board component to open the modal from the route param.
