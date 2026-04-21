---
name: theme-change + DaisyUI swap integration
description: How to wire the theme-change library with a DaisyUI swap checkbox, and the required global.css theme declaration
type: feedback
---

When integrating `theme-change` with a DaisyUI swap toggle:

- **Do not** put `data-toggle-theme` on the `<label>` that wraps a checkbox. theme-change's click listener conflicts with the checkbox's native toggle behavior, making the icon and theme both stop responding.
- Instead, call `themeChange(false)` for initialization only (reads `localStorage` → sets `data-theme` on `<html>`), then drive toggling via a `change` event listener on the checkbox itself, manually setting `html.setAttribute('data-theme', theme)` and `localStorage.setItem('theme', theme)`.
- Sync the initial checkbox checked state from `localStorage.getItem('theme')`, not from `html.getAttribute('data-theme')` (avoids a race with themeChange init timing).

**DaisyUI theme declaration** — any theme used at runtime must be listed in `global.css`:
```css
@plugin "daisyui" {
  themes: dracula --default, cupcake;
}
```
If a theme isn't declared here, DaisyUI never generates its CSS and switching to it does nothing visually.

**Why:** Discovered during implementation — `data-toggle-theme` on the label silently broke both the swap icon and the theme switch.

**How to apply:** Any future theme toggle work in this project should follow this pattern. Always verify `global.css` lists every theme in use.
