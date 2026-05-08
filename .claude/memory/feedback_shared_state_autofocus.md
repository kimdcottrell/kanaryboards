---
name: Avoid shared reducer state for inline editing when multiple components render the same edit UI
description: Using shared editingRowId state caused both RowSection and BoardConfiguration to render autoFocus inputs simultaneously, stealing focus
type: feedback
---

When multiple components subscribe to the same editing state (e.g., `editingRowId`) and both conditionally render an `autoFocus` input when that state matches, the component rendered *later* in the React tree wins focus — making the earlier input appear non-functional.

**Why:** `RowSection` (board view) and `BoardConfiguration` (config panel) both used `editingRowId` from the global reducer. Double-clicking a row name in the config panel set `editingRowId`, which caused *both* to render `autoFocus` inputs. The `RowSection` input (rendered after `BoardConfiguration` in the tree) stole focus immediately, leaving the config panel input unfocusable.

**How to apply:** When two separate UI surfaces both need to inline-edit the same entity but shouldn't interfere with each other, give one (or both) **local component state** (`useState`) for the ephemeral editing UI, and dispatch a **direct one-shot action** (e.g., `ROW/RENAME { rowId, name }`) to save — bypassing the shared editing-state ceremony entirely. Reserve shared reducer state for editing that is intentionally mirrored across components.
