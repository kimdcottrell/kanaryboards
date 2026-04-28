# Memory Index

- [DaisyUI form & component styling](feedback_daisyui_styling.md) — fieldsets, helper text, responsive grid, semantic color tokens, correct class names, btn-primary for cross-theme buttons, navbar alignment math
- [Memory storage location](feedback_memory_location.md) — always write to /var/dev/.claude/memory/, never the global ~/.claude/ scope
- [Prefer named exports over new files for related shared components](feedback_component_extraction.md) — Extract shared UI as named exports from related existing files; move pure UI state into the extracted component to avoid prop drilling
- [Astro import extension resolution](reference_astro_import_extensions.md) — Omitting `.jsx`/`.tsx` from local imports is fine; Astro resolves them via TypeScript rules. Deno LSP `no-local` errors on these are false positives.
- [State architecture and types](project_store_types.md) — Types in context/types.ts, reducer in reducer.ts, three contexts in BoardContext.tsx; BoardState, BoardAction, null guard pattern, globalThis vs window
- [Project tech stack](project_stack.md) — Deno 2.x, Astro 6.x, React 19, Tailwind 4.x + DaisyUI 5.x, Google GenAI, localStorage only
- [Preact to React migration](project_preact_to_react_migration.md) — Full migration history: what was removed, added, and changed across all source files
- [Shell environment & available tooling](reference_environment.md) — Debian 13, bash 5.2, deno 2.7 only (no npm/yarn/pnpm/bun/python/node/ruby/go)
