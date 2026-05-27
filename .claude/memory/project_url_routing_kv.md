---
name: url-routing-and-kv
description: How URL-based task deep-linking and Deno KV persistence are implemented
metadata:
  type: project
---
Task edit modals are URL-addressable via `/task/:taskId`. Navigating directly to that URL opens the board with the edit modal pre-opened and renders SEO meta tags server-side.

**Why:** User wanted shareable URLs for task edit views plus SEO (dynamic `<title>` per task).

**Architecture:**
- `src/middleware.ts` — generates `boardId` UUID cookie on first visit; sets `Astro.locals.boardId`
- `src/lib/kv.ts` — Deno KV helpers: `getBoard(boardId)`, `saveBoard(boardId, data)`, `deleteBoard(boardId)`, `getTaskMeta(taskId)`
- `src/pages/api/board.ts` — GET loads board from KV, PUT saves it, DELETE clears on reset
- `src/pages/task/[taskId].astro` — SSR: fetches task title from KV → sets `<title>` and `<meta description>`, passes `initialTaskId` to React island
- `src/layouts/BaseLayout.astro` — shared page shell used by index.astro and task/[taskId].astro

**KV key structure:**
- `["board", boardId]` → `{ rows, columns, tasks, defaultColumnNames }`
- `["task_meta", taskId]` → `{ title, description, boardId }` (for O(1) SSR lookups)

**React routing (react-router-dom 7.x):**
- `BrowserRouter` wraps app in `BoardWrapper.jsx`
- Routes: `/` and `/task/:taskId` both render `<BoardInner />`
- `BoardInner` has a `useEffect` watching `[boardLoaded, taskId, tasks]` — once KV data is loaded, it finds the task and calls `startEditTask(task)`, or `navigate('/', { replace: true })` if the task doesn't exist
- Clicking a task card: calls `startEditTask(task)` (opens modal immediately) + `navigate('/task/:id')` (updates URL)
- Closing/saving/deleting in `TaskEditModal`: calls `navigate('/')` to close and update URL

**BoardContext data flow:**
1. Mount → fetch `/api/board` → if empty and localStorage has data, migrate it → `dispatch(BOARD/LOAD)`
2. State changes → debounced (500ms) PUT to `/api/board`
3. Reset → DELETE `/api/board` (clears task_meta entries); save effect then re-writes reset state

**How to apply:** When adding new entity types that need URL-based deep links, follow this pattern: add a KV meta index entry, add an Astro SSR page for SEO, use `useNavigate` in the card component, and a `useEffect` in the inner board component to open the modal from the route param.
