---
name: Phase 2 - split BoardProvider/useBoard into per-concern contexts
description: Deferred follow-up to the BoardState/reducer reorg - splitting the mega context/hook to fix broad re-renders, intended as its own branch
metadata:
  type: project
---

Phase 1 (done, on `feature/types-cleanup`) reorganized `BoardState`/`BoardAction`
into 9 named state interfaces + 8 named action unions and split `reducer.ts`
into `reducers/<domain>.ts` modules — see [[project_store_types]]. Zero
behavior/public-API changes; `useBoard()` still spreads the entire state into
every consumer.

**Phase 2 (not started, deserves its own branch):** split `BoardProvider`/
`useBoard()` into separate contexts/hooks, one per the 9 state groups (row
form, row edit, column edit, column config, task create, task edit, checklist
AI, drag, board data). Goal: components subscribe only to the slices they
actually use, instead of every keystroke (e.g. in the AI checklist prompt)
re-rendering the whole board tree (`RowBoard`, every `RowSection`, every
`ColumnCard`, every `TaskCard`).

**Key complication to design around:** several reducer cases are
cross-cutting — e.g. `COLUMN/DELETE` and `ROW/DELETE` also reset
`TaskCreateState`/`TaskEditState` fields (`taskCreateModalOpen`,
`editingTaskId`, `editTaskDraft`, `taskEditModalOpen`) when the
deleted column/row was referenced by the in-progress task. A clean
per-slice context split needs either (a) a coordinating top-level dispatch
that fans out to multiple slice reducers, or (b) deriving that cleanup as an
effect reacting to `BoardData` changes rather than doing it inline in the
`COLUMN/DELETE`/`ROW/DELETE` reducer cases.

**How to apply:** when this branch starts, inventory every reducer case that
touches more than one of the 9 state groups (the cross-cutting ones found so
far are `COLUMN/DELETE`, `ROW/DELETE`, `TASK/DELETE` touching `TaskEditState`,
and `TASK/CREATE`/`TASK/OPEN_CREATE_MODAL` touching `ChecklistAIState`) before
picking the split boundaries.
