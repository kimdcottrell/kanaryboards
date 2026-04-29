---
name: Playwright patterns for DaisyUI and React collapses
description: How to select, click, and assert against the three collapse mechanisms used in this codebase
type: feedback
---

Three collapse mechanisms exist; each needs a different Playwright approach.

**Why:** Discovered during manual MCP-browser walkthrough of collapse.spec.ts (2026-04-29).

**How to apply:** Use these patterns whenever writing or extending collapse tests.

---

## 1. DaisyUI checkbox-based collapse (BoardConfiguration.jsx)

HTML: `section.collapse > input[type="checkbox"].peer ~ .collapse-title ~ .collapse-content`

- **Do NOT click the `.collapse-title` or heading** — the invisible checkbox overlay intercepts pointer events and Playwright times out.
- **Click the checkbox directly:** `page.locator("#board-config-collapse-toggle").click()`
- **State assertion:** `toBeChecked()` / `not.toBeChecked()` on the checkbox
- **Content assertion:** `toBeVisible()` / `not.toBeVisible()` on text inside `#board-config-collapse-content`

## 2. DaisyUI React-state collapse (ChecklistGenerationCollapse in ChecklistSection.jsx)

HTML: `div#checklist-gen-collapse.collapse[class*="collapse-open"]`; toggle is a `<button>` (not a checkbox).

- **Click the toggle button directly:** `page.locator("#checklist-gen-collapse-toggle").click()`
- **State assertion:** `toHaveClass(/collapse-open/)` / `not.toHaveClass(/collapse-open/)` on `#checklist-gen-collapse`
- **Content assertion:** `toBeVisible()` / `not.toBeVisible()` on text inside `#checklist-gen-collapse-content`

## 3. Custom React conditional-render collapse (RowSection.jsx)

HTML: the columns `div` is conditionally rendered — it is absent from the DOM entirely when collapsed.

- **Click the toggle:** `page.locator("#row-collapse-btn-{rowId}").click()`
- **Row ID is dynamic** — read it at runtime:
  ```ts
  const rowId = await page.locator("[id^='row-section-']").first()
    .getAttribute("id")
    .then((id: string | null) => id!.replace("row-section-", ""));
  ```
- **State assertion:** `toBeAttached()` / `not.toBeAttached()` on `#row-columns-{rowId}` — use `toBeAttached` not `toBeVisible` since the element is removed from the DOM, not just hidden.
- **aria-label assertion:** button flips between `"Collapse row"` and `"Expand row"` — use `toHaveAttribute("aria-label", ...)` to confirm state.

---

## ID naming convention (established 2026-04-29)

| Scope | Pattern | Example |
|---|---|---|
| Component wrapper | `{component}` | `board-config` |
| Collapse wrapper | `{component}-collapse` | `checklist-gen-collapse` |
| Collapse toggle | `{component}-collapse-toggle` | `board-config-collapse-toggle`, `checklist-gen-collapse-toggle` |
| Collapse content | `{component}-collapse-content` | `board-config-collapse-content`, `checklist-gen-collapse-content` |
| Sub-sections | `{component}-{subsection}` | `board-config-create-new-row`, `board-config-danger-zone` |
| Dynamic (per-row) | `{component}-{rowId}` | `row-section-{id}`, `row-collapse-btn-{id}`, `row-columns-{id}` |
