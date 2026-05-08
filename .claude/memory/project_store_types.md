---
name: State architecture and types
description: Where types, state, and reducers live in the Kanary Boards context architecture, and the key patterns used
type: project
---

State was refactored from a monolithic `store.ts` into separate files under `src/components/context/`:

- `types.ts` — all exported interfaces (`ChecklistItem`, `Row`, `Column`, `Task`, `TaskDraft`, `DraggedTask`, `BoardState`) and the `BoardAction` discriminated union
- `reducer.ts` — `boardReducer` and `createInitialState`
- `selectors.ts` — derived/computed state selectors
- `constants.ts` — `STORAGE_KEY` and other constants
- `BoardContext.tsx` — three contexts (`BoardStateContext`, `BoardDispatchContext`, `BoardRefsContext`) and the `BoardProvider` component; also exports `useBoardState()` and `useBoardDispatch()` hooks
- `useBoard.ts` — additional board hooks
- `useAsyncActions.ts` — async action helpers (AI generation, etc.)

**Key interfaces (all in `types.ts`):**
```ts
interface ChecklistItem { id: string; text: string; checked: boolean; }
interface Row { id: string; name: string; color: string; }
interface Column { id: string; name: string; }
interface Task { id: string; rowId: string; colId: string; title: string; description: string; checklist: ChecklistItem[]; }
interface TaskDraft { title: string; description: string; checklist: ChecklistItem[]; rowId: string; colId: string; }
interface DraggedTask { taskId: string; rowId: string; colId: string; }
```

`BoardState` includes both persistent (`rows`, `columns`, `tasks`, `defaultColumnNames`) and ephemeral fields (`editingTaskId`, `editTaskDraft: Task | null`, `draggedTask: DraggedTask | null`, `editingRowId`, `editingRowName`, `editingColumnId`, `editingColumnRowId`, `editingColumnName`, etc.).

`globalThis.` is used instead of `window.` everywhere (deno lint `no-window` rule).

**Drag-and-drop state split:** `draggedTask: DraggedTask | null` lives in reducer (shared across all columns). `dropTarget: { taskId, position }` for the hover indicator is local `useState` in `ColumnCard` — it's too ephemeral for the reducer. A `useEffect` in `ColumnCard` watches `draggedTask` and clears `dropTarget` when it becomes null (covers cancelled drags).

**Task ordering:** No explicit `order`/`position` field — ordering is determined by array position in `state.tasks`. `TASK/REORDER_IN_CELL` removes the task and splices it back in at the target index. Cross-row moves are blocked by the reducer (rowId must match). Cross-column moves within the same row are allowed via `DRAG/DROP_TASK`.

**Inline editing patterns (two distinct approaches):**
- `RowSection` (board view) uses shared reducer state: `ROW/EDIT_START`, `ROW/EDIT_CHANGE`, `ROW/EDIT_SAVE`, `ROW/EDIT_CANCEL` actions drive `editingRowId`/`editingRowName` in `BoardState`.
- `BoardConfiguration` Row Settings uses **local component state** (`useState`) to avoid conflicts: `editId`/`editName` are local, saving dispatches `ROW/RENAME` (a direct one-shot rename action) instead of the shared editing state flow.
- `ColumnCard` column name editing uses shared state: `COLUMN/RENAME_START`, `COLUMN/RENAME_CHANGE`, `COLUMN/RENAME_SAVE`, `COLUMN/RENAME_CANCEL` drive `editingColumnId`/`editingColumnRowId`/`editingColumnName`. The `editingColumnRowId` field scopes the edit input to the specific row where the double-click occurred — without it, every row renders an `autoFocus` input for the same column simultaneously, causing the first to immediately blur and save. On save, the rename propagates to all rows because columns are shared objects. The `COLUMN/RENAME_START` payload includes both `columnId` and `rowId`; `editColumnTitle(column, row)` in `useBoard.ts` must pass both.

**Why:** deno lint `no-explicit-any` and `no-window` rules enforced across the codebase.
**How to apply:** When adding state, add fields to `BoardState` in `types.ts`, handle them in `reducer.ts`, and dispatch via `BoardAction` union. Add null guards to `editTaskDraft` functional updaters. Keep per-column ephemeral UI state (hover targets, etc.) in component-local useState, not the reducer.
