---
name: Drag-and-drop drop indicator style
description: User confirmed colored border lines (row.color) for DnD drop position indicators are the right visual approach
type: feedback
---

Use `row.color` as the border color for drag-and-drop position indicators on task cards. Show a 2px top border when inserting *before* a card, 2px bottom border when inserting *after*. Always render the border as `transparent` when not active to prevent layout shift.

Always dim the card being dragged to 40% opacity (`opacity: 0.4`).

**Why:** User explicitly confirmed "I love the colored line. It is very clear how the drag and drop is going to work." The row color is already used for all interactive accents in that row (buttons, backgrounds), so it's visually consistent.

**How to apply:** When adding any DnD position feedback in this project, use inline `borderTop`/`borderBottom` with `row.color` (not a fixed primary color or Tailwind class). Use `"2px solid transparent"` as the default to avoid layout shift.
