---
name: store.ts type architecture
description: Interfaces defined in store.ts for the Kanban board, and patterns used to satisfy deno lint no-explicit-any
type: project
---

`src/components/refactor/store.ts` defines these interfaces at the top of the file:

```ts
interface ChecklistItem { id: string; text: string; checked: boolean; }
interface Row { id: string; name: string; color: string; }
interface Column { id: string; name: string; }
interface Task { id: string; rowId: string; colId: string; title: string; description: string; checklist: ChecklistItem[]; }
interface TaskDraft { title: string; description: string; checklist: ChecklistItem[]; rowId: string; colId: string; }
interface DraggedTask { taskId: string; rowId: string; colId: string; }
```

Key typing decisions made:
- `editingTaskId`: `string | null`
- `editTaskDraft`: `Task | null` — requires null guards (`if (!prev) return prev`) in `setEditTaskDraft` callbacks
- `checklistModalTaskId`: `string | null`
- `draggedTask`: `DraggedTask | null`
- `draggedDefaultIndex`: `number | null`
- `editingRowId`: `string | null`
- `checklistInputRefs`: `useRef<Record<string, HTMLInputElement>>({})`
- `tasksByCell`: `Record<string, Task[]>`
- `updateChecklistItem` / `updateEditChecklistItem` value param: `string | boolean`
- `setChecklistInputRef` element param: `HTMLInputElement | null`

`DragEvent.dataTransfer` accessed with non-null assertion (`event.dataTransfer!`) instead of `as any`.

`window.` replaced with `globalThis.` everywhere to satisfy `no-window` deno lint rule.

**Why:** deno lint `no-explicit-any` and `no-window` rules enforced across the codebase.
**How to apply:** Use these interfaces when adding new state or functions to the store. Add null guards to any `setEditTaskDraft` functional updaters.
