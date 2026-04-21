---
name: Memory storage location
description: Memories must be written to the project-local .claude/memory/ directory, not the global ~/.claude/ scope
type: feedback
---

Always write memory files to `/var/dev/.claude/memory/`, not to `/home/deno/.claude/projects/...` or any global path.

**Why:** The user explicitly corrected this — memory should stay within the project, not the global Claude scope.

**How to apply:** Any time the Write tool is used for a memory file, the path must start with `/var/dev/.claude/memory/`.
