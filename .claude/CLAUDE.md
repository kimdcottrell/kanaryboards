# Claude Workspace Instructions

## Memory

All auto memory files must be written to `/var/dev/.claude/memory/`. Never write memory to `~/.claude/projects/...` or any other global path. The index file is `/var/dev/.claude/memory/MEMORY.md`.

- reference the documentation sources in `.claude/.mcp.json` when writing code for `react`, `astro`, `deno`, `daisy`, `tailwind`, `docker`, `zod`, and any other frameworks that are linked in that file

