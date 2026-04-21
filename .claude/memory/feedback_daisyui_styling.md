---
name: DaisyUI form styling approach
description: How the user wants DaisyUI forms styled — semantic elements, per-field fieldsets, helper text, responsive grids, and correct class names
type: feedback
---

Use proper DaisyUI form conventions in this project:

- Each field gets its own `<fieldset class="fieldset">` with a `<legend class="fieldset-legend">` — never use `<label class="fieldset-legend">` or group multiple fields in one fieldset
- Add `<p class="label">` helper text under inputs where context helps
- Add `<p class="validator-hint">` for required fields (no `hidden` class — DaisyUI CSS handles visibility via `:invalid`)
- Use `text-base-content/50 font-normal` for de-emphasized inline annotations like "(optional)" inside legends
- Lay out sibling fields in a `grid grid-cols-1 md:grid-cols-2 gap-4` wrapper so they stack on mobile and sit side-by-side at `md`+
- When clearing controlled inputs after submission, increment a `key` on the form to remount it and reset HTML5 validation state

**Correct DaisyUI class names for form elements:**
- Inputs: `input input-bordered w-full`
- Textarea: `textarea textarea-bordered w-full`
- Select: `select select-bordered w-full`
- Field wrapper (legacy style): `<div class="form-control">`
- Labels (legacy style): `<label class="label"><span class="label-text">...</span></label>`
- Hint text below a field: `<label class="label"><span class="label-text-alt">...</span></label>`
- Buttons: `btn btn-primary`, `btn btn-ghost`, `btn btn-error btn-outline`, `btn btn-secondary`, `btn btn-outline btn-sm`
- Checkboxes: `checkbox checkbox-sm`
- Ghost inline input (e.g. inside a bordered row): `input input-ghost input-sm grow`
- Modal: use `<dialog>` with `modal-open` class toggled + `modal-backdrop` div for outside-click close. Do NOT use `<div class="modal modal-open">` (legacy).

**Multi-theme color safety:**
- Never use hardcoded dark Tailwind colors (`bg-neutral-800`, `bg-gray-900`, etc.) — they break in light themes. Use DaisyUI semantic tokens: `bg-base-100`, `bg-base-200`, `bg-base-300`.
- `btn-soft btn-accent` washes out on light themes. Use `btn-primary` for cross-theme contrast.
- DaisyUI's `.navbar` has built-in `px-4`. To align with a `sm:p-10` main element, use `sm:px-6` on the inner wrapper.

**Why:** Project uses DaisyUI throughout. Raw Tailwind bypasses theming and dark mode support.

**How to apply:** Any time a form or component is created or edited, follow these patterns. Always fetch DaisyUI docs via the MCP server in `.claude/.mcp.json` to verify current class names.
