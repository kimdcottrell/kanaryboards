---
name: Prefer named exports over new files for related shared components
description: When extracting a shared UI block, add it as a named export to the most relevant existing file rather than creating a new file
type: feedback
---

When a UI block is duplicated across two components, extract it as a named export from the most semantically related existing file — don't always create a new file.

Example from this project: `ChecklistGenerationCollapse` was duplicated in `TaskCreateModal` and `TaskEditModal`. Rather than creating `ChecklistGenerationCollapse.jsx`, it was added as a named export to `ChecklistSection.jsx` because they're conceptually the same domain (checklist management).

Also: pure UI state (e.g. a collapse open/closed toggle) belongs inside the component that owns the UI, not in a parent modal. Moving `checklistCollapseOpen` into `ChecklistGenerationCollapse` eliminated it from both modals.

**Why:** Keeps related code co-located. Avoids prop drilling — the extracted component can sit as a sibling to other components in the parent, receiving props directly rather than threading them through intermediaries.

**How to apply:** Before creating a new file for an extracted component, ask whether it belongs as a named export of an existing file. Check whether any state in the parent is purely UI state that should move into the extracted component.
