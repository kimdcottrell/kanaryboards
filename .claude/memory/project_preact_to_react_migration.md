---
name: Preact to React migration
description: The codebase was fully migrated from Preact to React 19 — covers what changed and where
type: project
---
Completed a full Preact → React 19 migration of the Kanary Boards project.

**Why:** User requested it. No technical blocker; the codebase already used React idioms via @preact/compat.

**How to apply:** The project now uses real React — do not introduce any preact imports, preact/hooks, or @astrojs/preact.

## What changed

**Packages removed:** `preact`, `@astrojs/preact`, `@preact/signals`, `preact-mcp`  
**Packages added:** `react@^19`, `react-dom@^19`, `@astrojs/react@^5`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`  
**Overrides removed:** `react` and `react-dom` preact/compat aliases (kept `vite` override)

**Config files touched:**
- `package.json` — dependency swap
- `astro.config.mjs` — `@astrojs/preact` → `@astrojs/react`
- `tsconfig.json` — `jsxImportSource: "react"`, removed preact/compat path aliases for react/react-dom
- `src/pages/index.astro` — `client:only="preact"` → `client:only="react"`

**Source file changes (applied across all JSX/TSX files):**
- All imports from `preact` / `preact/hooks` → `react`
- `ComponentChildren` type → `ReactNode` (in BoardContext.tsx)
- `JSX.MouseEventHandler` → `MouseEventHandler` (in CloseButton.tsx)
- `Dispatch` type import → `react` (was `preact/hooks`)
- `class=` → `className=` on every JSX element
- `onInput=` → `onChange=` on all inputs, textareas, and checkboxes
- `onDblClick` → `onDoubleClick`
- SVG hyphenated attrs → camelCase (`stroke-linecap` → `strokeLinecap`, etc.) in BoardConfiguration.jsx
- `draggable="false"/"true"` string → boolean `draggable={!isEditing}` in TaskCard.jsx
- CloseButton `class` prop renamed to `className` in interface + all call sites

**Files with no Preact imports that still needed `class`→`className`:**
Modal.jsx, TaskForm.jsx, TaskCreateModal.jsx, TaskEditModal.jsx, TaskCard.jsx, ColumnCard.jsx, RowBoard.jsx, BoardConfiguration.jsx

**Files unchanged:** BoardWrapper.jsx, BoardInner.jsx, reducer.ts, selectors.ts, constants.ts, types.ts, ThemeController.astro, generate-tasks.ts
