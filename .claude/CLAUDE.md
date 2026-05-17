# Claude Workspace Instructions

## Memory

All auto memory files must be written to `/var/dev/.claude/memory/`. Never write memory to `~/.claude/projects/...` or any other global path. The index file is `/var/dev/.claude/memory/MEMORY.md`.

## Runtime

Use `deno` only. Never use `npm`, `npx`, `yarn`, `pnpm`, `bun`, `node`, or `python3` — they do not exist in this environment. Prefer a bash (awk/sed/jq/find/grep/cat/echo) solution for scripting. 