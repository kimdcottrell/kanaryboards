# Memory Index

- [DaisyUI form & component styling](feedback_daisyui_styling.md) — fieldsets, helper text, responsive grid, semantic color tokens, correct class names, btn-primary for cross-theme buttons, navbar alignment math
- [Memory storage location](feedback_memory_location.md) — always write to /var/dev/.claude/memory/, never the global ~/.claude/ scope
- [Prefer named exports over new files for related shared components](feedback_component_extraction.md) — Extract shared UI as named exports from related existing files; move pure UI state into the extracted component to avoid prop drilling
- [Astro import extension resolution](reference_astro_import_extensions.md) — Omitting `.jsx`/`.tsx` from local imports is fine; Astro resolves them via TypeScript rules. Deno LSP `no-local` errors on these are false positives.
- [State architecture and types](project_store_types.md) — Row/Column use `title`+`order`, Task has `order`; fractional-indexing via `@lib/order.ts`; `defaultColumnNames` removed; BoardState/BoardAction split into named groups + reducers/ modules; BoardView URL-sync gotcha
- [Drag-and-drop drop indicator style](feedback_drag_drop_indicator.md) — Use row.color for 2px border indicators; transparent default to prevent layout shift; 40% opacity on dragged card
- [Shared state + autoFocus conflict](feedback_shared_state_autofocus.md) — Don't use shared reducer state for inline editing when multiple components render autoFocus inputs; the later-rendered component wins focus
- [Project tech stack](project_stack.md) — Deno 2.x, Astro 6.x SSR on Deno Deploy, React 19 + react-router-dom 7, Tailwind 4.x + DaisyUI 5.x, Google GenAI, Deno KV for persistence
- [URL routing and Deno KV architecture](project_url_routing_kv.md) — KV keys: ["user_board", userId]→boardId, ["board", boardId]→PersistedBoard; no task_meta; middleware uses Clerk userId for authenticated boardId; PersistedBoard has no defaultColumnNames
- [crypto.randomUUID requires secure context](feedback_crypto_uuid_secure_context.md) — Always add a Math.random fallback; fails silently on network IPs over plain HTTP
- [Preact to React migration](project_preact_to_react_migration.md) — Full migration history: what was removed, added, and changed across all source files
- [Shell environment & available tooling](reference_environment.md) — Debian 13, bash 5.2, deno 2.7 only (no npm/yarn/pnpm/bun/python/node/ruby/go)
- [Playwright test setup](project_playwright_setup.md) — Docker trigger, test file index, fixtures (test vs testNoClerk), Clerk rate-limit pattern, and standard interaction patterns
- [CI/CD workflows](project_cicd_workflows.md) — auto-create-pr (feature/bugfix branches) and e2e (Deno Deploy preview polling) workflows; required secrets
- [Playwright collapse test patterns](feedback_playwright_collapse_patterns.md) — per-mechanism selectors/assertions for DaisyUI checkbox collapse, DaisyUI React-state collapse, and custom conditional-render collapse; ID naming convention
- [Docker Compose filename](feedback_compose_filename.md) — this project uses compose.yaml (V2 preferred name), not docker-compose.yml; always check compose.yaml first
- [Security response headers](project_security_headers.md) — all 6 security headers set in src/middleware.ts (prod-gated); CSP is Report-Only, ongoing WIP/pain point; why Astro-native security.csp was rejected; 2026-07-08 Cloudflare CSP audit (proxying alone needs no CSP entries, feature-specific ones already covered)
- [Cloudflare client IP gotcha](project_cloudflare_client_ip.md) — Deno adapter's clientAddress is Cloudflare's edge IP once proxied, not the visitor's; middleware.ts now prefers CF-Connecting-IP header