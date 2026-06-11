---
name: State architecture and types
description: Where types, state, and reducers live in the Kanary Boards context architecture, and the key patterns used
metadata:
  type: project
---

State lives under `src/components/context/`:

- `types.ts` — `BoardState` is now an intersection of 9 named interfaces (`BoardData`, `RowFormState`, `RowEditState`, `ColumnEditState`, `ColumnConfigState`, `TaskCreateState`, `TaskEditState`, `ChecklistAIState`, `DragState`); `BoardAction` is a union of 8 named per-domain unions (`ColumnAction`, `RowAction`, `TaskAction`, `ChecklistAction`, `ChecklistAIAction`, `TaskAIAction`, `DragAction`, `BoardLifecycleAction`). Same flattened shape/members as before — no consumer changes.
- `reducer.ts` — thin router; `createInitialState` plus a `boardReducer` switch that delegates each case to `reducers/<domain>.ts` (one-line `case "X/Y": return domain.fn(state, action.payload);`)
- `reducers/` — `board.ts`, `columns.ts`, `rows.ts`, `tasks.ts`, `checklist.ts`, `checklistAi.ts`, `taskAi.ts`, `drag.ts` — one function per action, typed via `Extract<XAction, {type: "..."}>["payload"]`
- `selectors.ts` — `computeTasksByCell` (groups + sorts tasks by `order`), `findTodoColumnId`
- `constants.ts` — `STORAGE_KEY`, `createDefaultBoard()`, `emptyTaskDraft()`
- `BoardContext.tsx` — three contexts (`BoardStateContext`, `BoardDispatchContext`, `BoardRefsContext`) and `BoardProvider`; also exports `useBoardState()` / `useBoardDispatch()`
- `useBoard.ts` — all board action handlers
- `useAsyncActions.ts` — async action helpers (AI generation, row add with order)

**Key interfaces (all in `types.ts`):**
```ts
interface Row    { id: string; title: string; color: string; order: string; }
interface Column { id: string; title: string; order: string; }
interface Task   { id: string; rowId: string; colId: string; title: string; description: string; checklist: ChecklistItem[]; order: string; }
```
`name` was renamed to `title` on `Row` and `Column` to match schema.dbml. `order` (fractional index string) was added to all three types.

**Ordering — `fractional-indexing` package:**
Import `generateKeyBetween` and `generateNKeysBetween` directly from `"fractional-indexing"`. Sort with native `<`/`>` comparison, NOT `localeCompare()`. Used everywhere ordering mutates state:
- `ROW/MOVE` — computes `generateKeyBetween(prev?.order, next?.order)` for the moved row
- `COLUMN/REORDER` — same pattern for columns
- `TASK/REORDER_IN_CELL` — computes new order relative to cell neighbors; now purely order-field based, no global array splice
- `DRAG/DROP_TASK` — appends to target cell via `generateKeyBetween(lastInCell?.order, null)`
- `BOARD/LOAD` — sorts rows and columns by `order` on load
- `computeTasksByCell` — sorts each cell's tasks by `order`

**`BoardState` persistent fields:** `rows`, `columns`, `tasks`. `defaultColumnNames` was removed — it is no longer persisted and no longer in `BoardState`. Column titles are the source of truth.

**Column management actions (current):**
- `COLUMN/ADD` — payload `{ id, title, order }`, appended to `state.columns`
- `COLUMN/DELETE` — replaces old `COLUMN/REMOVE_DEFAULT`
- `COLUMN/REORDER` — payload `{ columnId, beforeColumnId | null }`, replaces old `COLUMN/MOVE_DEFAULT`
- `COLUMN/RENAME_SAVE` — only updates `column.title`; no longer syncs a separate `defaultColumnNames` array

**`useBoard.ts` column API:**
- `addColumn(title)` — dispatches `COLUMN/ADD` with generated order
- `reorderColumn(columnId, beforeColumnId)` — dispatches `COLUMN/REORDER`
- `deleteColumn(columnId)` — dispatches `COLUMN/DELETE`
- `handleDefaultColumnDrop(targetColumnId)` — now takes column ID, not array index

**`createTask` in `useBoard.ts`:** Computes `order = generateKeyBetween(null, firstTaskInCell?.order)` to prepend to cell.

**`addRow` in `useAsyncActions.ts`:** Computes `order = generateKeyBetween(lastRow?.order, null)` for new rows. Payload uses `title` not `name`.

**Drag-and-drop state split:** `draggedTask: DraggedTask | null` lives in reducer. `dropTarget` for hover indicators is local `useState` in `ColumnCard`.

**Inline editing patterns (two distinct approaches):**
- `RowSection` (board view): shared reducer state via `ROW/EDIT_START` / `ROW/EDIT_CHANGE` / `ROW/EDIT_SAVE` / `ROW/EDIT_CANCEL`
- `BoardConfiguration` row settings: local `useState` + `ROW/RENAME` (one-shot dispatch)
- `ColumnCard`: shared state via `COLUMN/RENAME_*`; `editingColumnRowId` scopes the input to the clicked row (prevents multi-row autoFocus conflict)

**`BoardView.tsx` URL↔modal sync gotcha:** A `useEffect` keyed on `[boardLoaded, taskId, tasks]` opens `TaskEditModal` via `startEditTask(task)` whenever `/task/:taskId` matches a task. Because `tasks` is in the deps, saving an edit (which mutates `state.tasks`) used to re-fire this effect *while still on the same URL* and re-open the just-closed modal — so clicking "Save" appeared to do nothing. Fixed with a `syncedTaskId` ref: `startEditTask` only fires once per distinct `taskId` (reset to `undefined` when `taskId` becomes falsy). `TaskEditModal`'s Save handler also now calls `navigate("/")` after `saveTaskEdit`, matching Close/Delete. **If you add new reactive deps to that effect, re-check this interaction.**

**Why:** `globalThis.` used instead of `window.` (deno lint `no-window`). `defaultColumnNames` removed because schema.dbml has no such field — columns are the source of truth.

**How to apply:** When adding fields: add to `BoardState` in `types.ts`, handle in `reducer.ts`, dispatch via `BoardAction`. For new entity types with ordering, import `generateKeyBetween`/`generateNKeysBetween` directly from `"fractional-indexing"`. Keep per-column ephemeral UI (hover targets) in local `useState`, not the reducer.
