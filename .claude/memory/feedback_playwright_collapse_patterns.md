---
name: Playwright patterns for DaisyUI and React collapses
description: How to select, click, and assert against the three collapse mechanisms used in this codebase
type: feedback
---

Two collapse mechanisms exist (a third, the board-config checkbox collapse, was replaced by a modal); each needs a different Playwright approach.

**Why:** Discovered during manual MCP-browser walkthrough of collapse.spec.ts (2026-04-29).

**How to apply:** Use these patterns whenever writing or extending collapse tests.

---

## 1. Board config — no longer a collapse

The old DaisyUI checkbox collapse (`BoardConfiguration.jsx`) is gone. `#board-config-collapse-toggle` is now the gear button in `BoardMenu.tsx` that opens `BoardConfigModal` (content root `#board-config`). Click it like any button and assert the modal content is visible; there is no checkbox or `#board-config-collapse-content` anymore. The ID kept its old name.

## 2. DaisyUI React-state collapse (ChecklistGenerationCollapse in task/form-elements/ChecklistSection.tsx)

HTML: `div#checklist-gen-collapse.collapse[class*="collapse-open"]`; toggle is a `<button>` (not a checkbox).

- **Click the toggle button directly:** `page.locator("#checklist-gen-collapse-toggle").click()`
- **State assertion:** `toHaveClass(/collapse-open/)` / `not.toHaveClass(/collapse-open/)` on `#checklist-gen-collapse`
- **Content assertion:** `toBeVisible()` / `not.toBeVisible()` on text inside `#checklist-gen-collapse-content`

## 3. Custom React conditional-render collapse (RowSection.tsx)

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
| Collapse content | `{component}-collapse-content` | `checklist-gen-collapse-content` |
| Sub-sections | `{component}-{subsection}` | `board-config-create-new-row`, `board-config-danger-zone` |
| Dynamic (per-row) | `{component}-{rowId}` | `row-section-{id}`, `row-collapse-btn-{id}`, `row-columns-{id}` |
