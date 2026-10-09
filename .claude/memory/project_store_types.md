---
name: State architecture and types
description: Where types, state, and reducers live in the Kanary Boards context architecture, and the key patterns used
metadata:
  type: project
---

State lives under `src/components/context/`:

- `types.ts` — `BoardState` is an intersection of named per-slice interfaces (`BoardData`, `RowFormState`, `RowEditState`, `ColumnEditState`, `ColumnConfigState`, `TaskCreateState`, `TaskEditState`, `ChecklistAIState`, `DragState`, …); `BoardAction` is a union of named per-domain unions (`ColumnAction`, `RowAction`, `TaskAction`, `ChecklistAction`, `ChecklistAIAction`, `TaskAIAction`, `DragAction`, `BoardLifecycleAction`, …). Also `StoredColumn`/`StoredTask` (legacy-tolerant shapes accepted by `BOARD/LOAD`) and `TaskComment`.
- `reducer.ts` — thin router; `createInitialState` plus a `boardReducer` switch that delegates each case to `reducers/<domain>.ts` (one-line `case "X/Y": return domain.fn(state, action.payload);`)
- `reducers/` — `board.ts`, `columns.ts`, `rows.ts`, `tasks.ts`, `checklist.ts`, `checklistAi.ts`, `taskAi.ts`, `view.ts` — one function per action, typed via `Extract<XAction, {type: "..."}>["payload"]`
- `actions/` — per-domain action hooks (`task.ts`, `taskCreate.ts`, `taskEdit.ts`, `row*.ts`, `column*.ts`, `boardConfig.ts`, `view.ts`, …); `shared.ts` has `buildTasksFromTitles`. (The old `useBoard.ts` / `useAsyncActions.ts` are gone.)
- `selectors.ts` — `computeTasksByCell` (groups + sorts tasks by `order`), `findTodoColumnId`
- `constants.ts` — `STORAGE_KEY` (`"kanby-v0-1-0"`), `createId`, `emptyTaskDraft()`, `TRASH_RETENTION_DAYS` (30), `isTrashExpired`, `daysUntilPurge`
- `effects/` — side-effect hooks `BoardProvider` calls: `useBoardPersistence.ts` (load/migrate on mount, 500ms debounced autosave, cross-tab sync), `useDrawerRowMirror.ts` (rebuilds the Astro drawer's `#drawer-row-list` DOM), `useChecklistInputRefs.ts` (checklist input focus refs → `BoardRefsContext`)
- `BoardContext.tsx` — `BoardProvider` plus many fine-grained contexts (BoardData, TasksByCell, Drag, TaskEdit, ColumnEdit, BoardMeta `{boardId, isAuthenticated}`, …) so components only re-render on their slice; consumers import hooks from `hooks.ts`

**Key interfaces (all in `types.ts`):**
```ts
interface Row    { id; title; color; order; }
interface Column { id; title; order; pinnedToShortcut; pinnedToDock; icon: string|null; iconInBoardMenu; iconNearColumnTitle; isTrash: boolean; }
interface Task   { id; rowId; colId; title; description; checklist: ChecklistItem[]; order; trashedAt: string|null; preTrashColId: string|null; }
```
`name` was renamed to `title` on `Row` and `Column` to match schema.dbml. `order` is a fractional index string. Every new Column/Task field must also be added to the zod schema in `src/pages/api/board.ts` (it rejects the whole board otherwise) and backfilled in `normalizeColumn`/`normalizeTask` in `reducers/board.ts` for boards saved before the field existed.

**Trash column (added on feature/notes, 2026-10):** a fixed `isTrash` column, always sorted last, auto-created on `BOARD/LOAD` if missing and in `BOARD/RESET`. Excluded from settings/reorder/rename UIs. `TASK/TRASH` moves a task to the Trash cell of the same row and stamps `trashedAt` + `preTrashColId`; `TASK/RESTORE` returns it to `preTrashColId` (or the To Do column if that was deleted). `withTrashState` in `reducers/tasks.ts` applies the same stamping/clearing to `TASK/MOVE_TO_COLUMN` and drag drops. Trashed tasks open in `TaskViewOnlyModal` (`isTaskTrashed` + `preventEdits` in `src/lib/dashboard/view-only.ts`). Expired Trash tasks (30 days) are dropped in `load()` and by `POST /api/purge-trash` — see [[url-routing-and-kv]].

**Load paths (`useBoardPersistence`):** demo → `BOARD/LOAD createDemoBoard()`, never persisted. No saved board (KV 404 with no local board, or empty localStorage) → `BOARD/RESET` (default columns + Trash, no rows). A non-404 API error dispatches nothing (board stays unloaded); a thrown error → `BOARD/RESET`.

**Cross-tab sync (feature/notes, 2026-10):** every autosave also posts `{rows, columns, tasks}` on a `BroadcastChannel` (`board-sync:kv` signed in, `board-sync:local` signed out; none for demo). Receivers dispatch `BOARD/SYNC` → `board.sync` (last write wins, no normalize). Echo guard: the received JSON is kept in `lastSyncedRef`, and the autosave skips save + broadcast when its snapshot equals it. The first save after load is not broadcast (`loadedSnapshotRef`) so a freshly opened tab can't overwrite newer state in other tabs. If sync leaves no rows, task modals close; if a draft's row is gone, its `rowId` becomes `""` and the modal stays open. `saveEdit` re-adds a task deleted in another tab while it was being edited.

**Unsaved edit drafts:** `src/components/task/editDraftStore.ts`, outside the reducer. Closing `TaskEditModal` without saving writes the draft to localStorage `task+${id}` (or clears it if it matches the saved task); `startEditTask` reapplies it on next open; save/trash/delete clear it. `useHasEditDraft` (useSyncExternalStore on a same-tab event + `storage`) drives the TaskCard "edited but not saved" badge.

**Ordering — `fractional-indexing` package:**
Import `generateKeyBetween` and `generateNKeysBetween` directly from `"fractional-indexing"` (helpers in `ordering.ts`, e.g. `reorderKey`). Sort with native `<`/`>` comparison, NOT `localeCompare()`. Used everywhere ordering mutates state (row move, column reorder, task reorder/drop, `BOARD/LOAD` sort, `computeTasksByCell`).

**Drag-and-drop state split:** `draggedTask` lives in the reducer (`DragState`). `dropTarget` for hover indicators is local `useState` in `ColumnSection` (renamed from `ColumnCard`; DOM id `column-section-{rowId}-{colId}`).

**Inline editing patterns (two distinct approaches):**
- `RowSection` (board view): shared reducer state via `ROW/EDIT_START` / `ROW/EDIT_CHANGE` / `ROW/EDIT_SAVE` / `ROW/EDIT_CANCEL`
- `RowSettingsSection` (in `BoardConfigModal`): local `useState` + `ROW/RENAME` (one-shot dispatch)
- `ColumnSection`: shared state via `COLUMN/RENAME_*`; `editingColumnRowId` scopes the input to the clicked row (prevents multi-row autoFocus conflict)

**`BoardView.tsx` URL↔modal sync gotcha:** A `useEffect` keyed on `[boardLoaded, taskId, tasks]` opens the task modal via `startEditTask(task)` whenever `/dashboard/task/:taskId` matches a task. Because `tasks` is in the deps, saving an edit (which mutates `state.tasks`) used to re-fire this effect *while still on the same URL* and re-open the just-closed modal. Fixed with a `syncedTaskId` ref: `startEditTask` only fires once per distinct `taskId`. Closing the modal (`ExistingTaskModalWrapper`, shared by Edit + ViewOnly) navigates to `/dashboard`. **If you add new reactive deps to that effect, re-check this interaction.**

**Why:** `globalThis.` used instead of `window.` (deno lint `no-window`). `defaultColumnNames` removed because schema.dbml has no such field — columns are the source of truth.

**How to apply:** When adding fields: add to the interface in `types.ts`, `schema.dbml`, the `/api/board` zod schema, and the `normalize*` backfill; handle the action in `reducers/<domain>.ts` and route it in `reducer.ts`. Keep per-column ephemeral UI (hover targets) in local `useState`, not the reducer.
