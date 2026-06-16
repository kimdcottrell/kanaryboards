# Claude Workspace Instructions

## Memory

All auto memory files must be written to `/var/dev/.claude/memory/`. Never write memory to `~/.claude/projects/...` or any other global path. The index file is `/var/dev/.claude/memory/MEMORY.md`.

## Runtime

Use `deno` only. Never use `npm`, `npx`, `yarn`, `pnpm`, `bun`, `node`, or `python3` — they do not exist in this environment. Prefer a bash (awk/sed/jq/find/grep/cat/echo) solution for scripting. 

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Sequence Diagram Maintenance

**Plans that touch the BoardContext dispatch/reducer/re-render flow must update the diagrams.**

`docs/sequence-diagrams/` documents how the Kanban board's `BoardContext` reducer architecture handles key user-triggered events (task drag-and-drop, task lifecycle & checklist AI, board load & autosave, row & column management) — what gets dispatched, which reducers run, and which components re-render.

When planning a change that touches this code (actions, reducers, `BoardContext`, or the components/contexts it re-renders):
- Identify which diagram file(s) under `docs/sequence-diagrams/` are affected.
- Draft the updated diagram content and present it as part of the plan, before the plan is accepted.
- Once the plan is approved, update the corresponding file(s) under `docs/sequence-diagrams/` as part of the implementation.

## 6. Schema Alignment

**Row, Column, and Task interfaces must stay aligned with `src/db/schema.dbml`.**

When adding, removing, or renaming fields on Row, Column, or Task:
- Check `src/db/schema.dbml` for the corresponding table definition.
- Keep field names, types, and nullability consistent with the dbml schema.
- If the dbml schema itself needs to change, call this out as part of the plan.
