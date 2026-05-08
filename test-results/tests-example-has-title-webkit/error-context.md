# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/example.spec.ts >> has title
- Location: tests/example.spec.ts:3:1

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Kanary/
Received string:  "Tunnel Not Connected - local.dev"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    9 × unexpected value "Tunnel Not Connected - local.dev"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Tunnel Not Connected" [level=1] [ref=e3]
  - paragraph [ref=e4]:
    - text: Tunnel
    - strong [ref=e5]: kanary
    - text: is not connected.
  - paragraph [ref=e6]:
    - text: Start a tunnel with
    - code [ref=e7]: localdev start --subdomain name
  - paragraph [ref=e8]:
    - link "Documentation" [ref=e9]:
      - /url: https://local.dev/docs/tunnels
```

# Test source

```ts
  1 | import { expect, test } from "@playwright/test";
  2 | 
  3 | test("has title", async ({ page }) => {
  4 |   await page.goto("/");
  5 | 
  6 |   // Expect a title "to contain" a substring.
> 7 |   await expect(page).toHaveTitle(/Kanary/);
    |                      ^ Error: expect(page).toHaveTitle(expected) failed
  8 | });
  9 | 
```