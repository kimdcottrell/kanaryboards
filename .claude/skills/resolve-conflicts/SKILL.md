---
name: resolve-conflicts
description: Use this skill when the user asks to "resolve merge conflicts", "fix merge conflicts", "help with conflicts", or "/resolve-conflicts". Identifies all conflicted files, walks through each one interactively with a suggested resolution, and completes the merge commit.
---

# Resolve Merge Conflicts

Walk through merge conflicts one file at a time, suggest resolutions, let the user decide, and complete the merge commit.

## Step 1: Identify conflicts

Run:

```
git diff --name-only --diff-filter=U
```

List the conflicted files to the user before doing anything else.

## Step 2: Walk through each file one at a time

For each conflicted file, in order:

1. **Show the conflict**: Read the file and display the HEAD vs incoming sections clearly.
2. **Explain both sides**: Describe in plain English what each side changed and why they conflict.
3. **Suggest a resolution**: Recommend which side to keep, or how to merge both — and explain your reasoning. Consider:
   - Are the changes independent and both needed? Merge them together.
   - Is one side a superset of the other? Keep the superset.
   - Is one side a cleanup/fix of the same thing? Prefer the cleaner version.
4. **Wait for the user**: Ask "Shall I apply that resolution?" before touching any code.
5. **If yes**: Apply the resolution and remove all conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). Verify no markers remain with `grep`.
6. **If no**: Let the user resolve it manually. Wait for them to say they're done before moving on.

### Special cases

**Lock files** (`deno.lock`, `package-lock.json`, etc.): Do not attempt to hand-merge. Suggest deleting and regenerating:
- `deno.lock` → delete it, then run `deno install`
- Always ask the user first — they may have a preferred approach.

**Auto-generated files**: Same as lock files — regenerate rather than merge.

**Both-added files** (two branches each created the same file): Show both versions in full, explain the differences, and suggest a resolution that preserves all independent additions.

## Step 3: Complete the merge commit

Once all files are resolved, stage them and commit:

```
git add <file1> <file2> ... && git commit
```

If the pre-commit hook blocks the commit due to an infrastructure issue (e.g., e2e tests failing because a service isn't running), explain the situation clearly and ask the user if they want to use `--no-verify`. Only use `--no-verify` with explicit user approval.

## Important notes

- Never resolve a file without user approval for that specific resolution.
- Never skip showing both sides of a conflict — the user needs to understand what they're accepting.
- After applying a resolution, always verify with `grep` that no conflict markers remain in the file.
- If a conflict is ambiguous (unclear which change is correct), say so and ask the user to decide the direction.
