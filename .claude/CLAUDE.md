# Claude Workspace Instructions

## Project overview
This repo is a Deno + Astro kanban board app built with Preact, Tailwind CSS, and DaisyUI.
The app stores board state in browser `localStorage` and includes a backend AI endpoint for generating task titles and checklists.

## Key files
- `src/components/KanbanBoard.jsx` — main interactive board component, task/row/column state, editing UI, and persistence logic
- `src/components/Modal.jsx` — reusable modal wrapper for dialog content
- `src/pages/api/generate-tasks.ts` — backend AI API route used for task/checklist generation
- `src/pages/index.astro` — main page layout and entry point
- `deno.jsonc` — Deno task configuration for development, build, and preview
- `docker-compose.yml` / `Dockerfile` — local container development setup
- `README.md` — human-facing notes and tooling references

## Development commands
- `deno task dev` — run Astro in development mode
- `deno task build` — build production assets
- `deno task preview` — preview the built output
- `docker compose up --build` — start the local development container

## Important conventions
- Keep changes inside existing Astro/Preact components unless the task explicitly requires a new route or major architecture change.
- Modal-only UI state should not be persisted to localStorage.
- Use the existing `src/pages/api/generate-tasks.ts` endpoint for AI generation logic.
- The app expects AI requests to route through SciTely to Deepseek, with environment keys like `DEEPSEEK_API_KEY` or `SCITELY_API_KEY`.
- Avoid introducing new frontend frameworks or large architectural changes without explicit instruction.
- In server-side code, do not assume browser globals such as `window` are available.

## Notes for Claude
- Focus on the existing board and task UI flows when asked to make changes.
- If a user asks for checklist or task generation features, extend `generate-tasks.ts` and wire it into `KanbanBoard.jsx`.
- Preserve current styling conventions: Tailwind/DaisyUI utility classes, compact component structure, and minimal markup.
- Prefer small, incremental updates that keep the app behavior consistent with the current kanban board experience.

## Example prompts
- "Add edit and delete buttons to the top-right corner of each task card."
- "Create a modal for AI-powered checklist generation inside the task edit view."
- "Fix the Deepseek/SciTely AI endpoint to correctly parse the latest response format."
- "Add a new footer to the page that says `Made with Claude by me@kimdcottrell.com`."
