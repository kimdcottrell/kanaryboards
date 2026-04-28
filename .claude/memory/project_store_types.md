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

`BoardState` includes both persistent (`rows`, `columns`, `tasks`, `defaultColumnNames`) and ephemeral fields (`editingTaskId`, `editTaskDraft: Task | null`, `draggedTask: DraggedTask | null`, etc.).

`globalThis.` is used instead of `window.` everywhere (deno lint `no-window` rule).

**Why:** deno lint `no-explicit-any` and `no-window` rules enforced across the codebase.
**How to apply:** When adding state, add fields to `BoardState` in `types.ts`, handle them in `reducer.ts`, and dispatch via `BoardAction` union. Add null guards to `editTaskDraft` functional updaters.
