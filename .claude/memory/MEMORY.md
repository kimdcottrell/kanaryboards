# Memory Index

- [DaisyUI form & component styling](feedback_daisyui_styling.md) — fieldsets, helper text, responsive grid, semantic color tokens, correct class names, btn-primary for cross-theme buttons, navbar alignment math
- [Memory storage location](feedback_memory_location.md) — always write to /var/dev/.claude/memory/, never the global ~/.claude/ scope
- [Prefer named exports over new files for related shared components](feedback_component_extraction.md) — Extract shared UI as named exports from related existing files; move pure UI state into the extracted component to avoid prop drilling
- [Astro import extension resolution](reference_astro_import_extensions.md) — Omitting `.jsx`/`.tsx` from local imports is fine; Astro resolves them via TypeScript rules. Deno LSP `no-local` errors on these are false positives.
- [State architecture and types](project_store_types.md) — Types in context/types.ts, reducer in reducer.ts, three contexts in BoardContext.tsx; BoardState, BoardAction, null guard pattern, globalThis vs window; drag-and-drop state split; task ordering by array position; two inline-edit patterns (shared reducer vs local useState + ROW/RENAME)
- [Drag-and-drop drop indicator style](feedback_drag_drop_indicator.md) — Use row.color for 2px border indicators; transparent default to prevent layout shift; 40% opacity on dragged card
- [Shared state + autoFocus conflict](feedback_shared_state_autofocus.md) — Don't use shared reducer state for inline editing when multiple components render autoFocus inputs; the later-rendered component wins focus
- [Project tech stack](project_stack.md) — Deno 2.x, Astro 6.x, React 19, Tailwind 4.x + DaisyUI 5.x, Google GenAI, localStorage only
- [Preact to React migration](project_preact_to_react_migration.md) — Full migration history: what was removed, added, and changed across all source files
- [Shell environment & available tooling](reference_environment.md) — Debian 13, bash 5.2, deno 2.7 only (no npm/yarn/pnpm/bun/python/node/ruby/go)
- [Playwright test setup](project_playwright_setup.md) — Docker trigger architecture, deno task e2e-test, pre-commit enforcement, CI workflow, test file index, and MCP quirks
- [CI/CD workflows](project_cicd_workflows.md) — auto-create-pr (feature/bugfix branches) and e2e (Deno Deploy preview polling) workflows; required secrets
- [Playwright collapse test patterns](feedback_playwright_collapse_patterns.md) — per-mechanism selectors/assertions for DaisyUI checkbox collapse, DaisyUI React-state collapse, and custom conditional-render collapse; ID naming convention
