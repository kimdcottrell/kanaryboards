---
name: DaisyUI form styling approach
description: How the user wants DaisyUI forms styled — semantic elements, per-field fieldsets, helper text, responsive grids
type: feedback
---

Use proper DaisyUI form conventions in this project:

- Each field gets its own `<fieldset class="fieldset">` with a `<legend class="fieldset-legend">` — never use `<label class="fieldset-legend">` or group multiple fields in one fieldset
- Add `<p class="label">` helper text under inputs where context helps
- Add `<p class="validator-hint">` for required fields (no `hidden` class — DaisyUI CSS handles visibility via `:invalid`)
- Use `text-base-content/50 font-normal` for de-emphasized inline annotations like "(optional)" inside legends
- Lay out sibling fields in a `grid grid-cols-1 md:grid-cols-2 gap-4` wrapper so they stack on mobile and sit side-by-side at `md`+
- When clearing controlled inputs after submission, increment a `key` on the form to remount it and reset HTML5 validation state

**Multi-theme color safety:**
- Never use hardcoded dark Tailwind colors (`bg-neutral-800`, `bg-gray-900`, etc.) in component backgrounds — they break in light themes like cupcake. Use DaisyUI semantic tokens: `bg-base-100`, `bg-base-200`, `bg-base-300`.
- `btn-soft btn-accent` washes out to near-invisible on light theme backgrounds. Use `btn-primary` for a solid filled button whose color is defined per-theme (teal in cupcake, pink in dracula), ensuring contrast in both.
- DaisyUI's `.navbar` has built-in `px-4` padding. To align navbar content with a `sm:p-10` main element, use `sm:px-6` on the inner wrapper (4 + 6 = 10 Tailwind units).

**Why:** User confirmed this approach looks good and wants it applied consistently going forward.

**How to apply:** Any time a form or component is created or edited in this project, follow these patterns by default. Always fetch the DaisyUI docs via the MCP server in `.claude/.mcp.json` to verify current class names before writing form markup.
