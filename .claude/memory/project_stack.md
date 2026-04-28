---
name: Project tech stack
description: Core runtime, framework, and tooling for the Kanary Boards project
type: project
---
Kanary Boards is a kanban board app. Key stack facts:

**Runtime:** Deno 2.x (not Node.js). Package manager is `deno install`. Tasks run via `deno run --allow-all astro <cmd>`. Scripts defined in `deno.jsonc`.

**Framework:** Astro 6.x with the Deno adapter (`@deno/astro-adapter`). The single interactive island is `<BoardWrapper client:only="react" />` in `src/pages/index.astro`.

**UI:** React 19 (migrated from Preact). Components live in `src/components/`. State is managed with Context API + useReducer (no Redux/Zustand). Three contexts: `BoardStateContext`, `BoardDispatchContext`, `BoardRefsContext`. Icons via `astro-icon` + `@iconify/json` + `@iconify/tailwind4`. Validation via `@lyfie/luthor`.

**Styling:** Tailwind CSS 4.x + DaisyUI 5.x. Uses `className=` (React convention). Two themes: `kanary-day` (light) and `kanary-night` (dark), toggled via ThemeToggle.tsx.

**AI:** Google GenAI SDK (`@google/genai`) via a POST endpoint at `src/pages/api/generate-tasks.ts`. Generates task titles and checklist items.

**Persistence:** localStorage only (no database).

**Type checking:** `deno run --allow-all astro check` — passes clean with exit 0.

**Lock file:** `deno.lock` (do not manually edit).
