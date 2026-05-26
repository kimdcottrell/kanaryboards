---
name: run-playwright
description: This skill should be used when the user asks to "run playwright tests", "run e2e tests", "run end-to-end tests", "fix playwright tests", or "check playwright". Runs the full Playwright test suite, explains any failures, walks through fixes one at a time with user approval, and repeats until all tests pass.
argument-hint: "[test file or pattern to run]"
---

# Run Playwright Tests

Run the Playwright test suite, explain failures clearly, and guide fixes interactively until all tests pass.

## How to Run Tests

Run all tests:

```
deno task e2e-test
```

If `$ARGUMENTS` is provided, it contains a specific test file or pattern — pass it to the test runner when supported. Note from the config: tests live in `tests/playwright/`, the base URL defaults to `https://kanary.local.dev`, and three browser projects run (chromium, firefox, webkit).

## Workflow

### Step 1: Run the tests

Execute `deno task e2e-test` and capture the full output. Note which tests passed and which failed.

### Step 2: If all tests pass

Report success clearly — list the test files that ran and the browser projects that passed. The workflow is complete.

### Step 3: If there are failures

**Explain the failures first.** Before attempting any fix:

- Summarize how many tests failed and in which files/browsers
- For each failure, explain in plain English what went wrong: what the test expected, what it got, and the likely root cause (selector mismatch, timing issue, wrong assertion, app regression, etc.)
- Group related failures together if they share a root cause

### Step 4: Fix failures one at a time

Work through each distinct failure (or root cause group) in order:

1. **Plan the fix**: Describe exactly what you would change and why. Be specific — name the file, line, and the change.
2. **Ask the user**: "Would you like me to implement this fix?" Wait for confirmation before touching any code.
3. **If yes**: Implement the fix, then move to the next failure.
4. **If no**: Note it and move on to the next failure.

After proposing (and optionally implementing) fixes for all failures, proceed to Step 5.

### Step 5: Re-run tests

Run `deno task e2e-test` again. Go back to Step 2.

Repeat this loop until either all tests pass or the user stops the process.

## Important Notes

- Never implement a fix without explicit user approval for that specific fix.
- If a failure is ambiguous (could be a test bug or an app bug), say so and let the user decide the direction before planning the fix.
- If a fix attempt makes things worse, explain what changed and what the new failure reveals.
- Tests run inside a specialized playwright container invoked via `deno task e2e-test` from the app container — do not try to run `npx playwright test` or `deno run playwright` directly.
