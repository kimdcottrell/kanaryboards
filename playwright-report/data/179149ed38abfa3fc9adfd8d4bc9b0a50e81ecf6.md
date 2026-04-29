# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: collapse.spec.ts >> Collapse functionality >> Board Configuration section >> closes when toggled again after opening
- Location: tests/collapse.spec.ts:36:9

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | test.describe("Collapse functionality", () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.addInitScript(() => localStorage.clear());
> 6   |     await page.goto("/");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  7   |   });
  8   | 
  9   |   /**
  10  |    * BoardConfiguration.jsx — DaisyUI checkbox-based collapse.
  11  |    * IDs: #board-config (section wrapper)
  12  |    *      #board-confi // use: {
  13  |   //   baseURL: "http://app:4321",
  14  |   //   trace: "on-first-retry",
  15  |   // },g-collapse-toggle (checkbox)
  16  |    *      #board-config-collapse-title, #board-config-collapse-content
  17  |    *      #board-config-create-new-row, #board-config-column-settings
  18  |    *      #board-config-row-display-settings, #board-config-danger-zone
  19  |    */
  20  |   test.describe("Board Configuration section", () => {
  21  |     test("is closed by default and opens when toggled", async ({ page }) => {
  22  |       const toggle = page.locator("#board-config-collapse-toggle");
  23  |       const content = page.locator("#board-config-collapse-content");
  24  | 
  25  |       await expect(toggle).not.toBeChecked();
  26  |       await expect(content.getByText("Add rows and columns, then place tasks"))
  27  |         .not.toBeVisible();
  28  | 
  29  |       await toggle.click();
  30  | 
  31  |       await expect(toggle).toBeChecked();
  32  |       await expect(content.getByText("Add rows and columns, then place tasks"))
  33  |         .toBeVisible();
  34  |     });
  35  | 
  36  |     test("closes when toggled again after opening", async ({ page }) => {
  37  |       const toggle = page.locator("#board-config-collapse-toggle");
  38  |       const content = page.locator("#board-config-collapse-content");
  39  | 
  40  |       await toggle.click();
  41  |       await expect(toggle).toBeChecked();
  42  | 
  43  |       await toggle.click();
  44  | 
  45  |       await expect(toggle).not.toBeChecked();
  46  |       await expect(content.getByText("Add rows and columns, then place tasks"))
  47  |         .not.toBeVisible();
  48  |     });
  49  |   });
  50  | 
  51  |   /**
  52  |    * RowSection.jsx — custom React state collapse.
  53  |    * IDs: #row-section-{rowId}, #row-collapse-btn-{rowId}, #row-columns-{rowId}
  54  |    * The rowId is read from the section's id attribute at runtime since it is
  55  |    * generated dynamically and stored in localStorage.
  56  |    */
  57  |   test.describe("Row section", () => {
  58  |     test("is expanded by default and collapses when toggled", async ({ page }) => {
  59  |       const rowSection = page.locator("[id^='row-section-']").first();
  60  |       const rowId = await rowSection.getAttribute("id").then((
  61  |         id: string | null,
  62  |       ) => id!.replace("row-section-", ""));
  63  |       const collapseBtn = page.locator(`#row-collapse-btn-${rowId}`);
  64  |       const columns = page.locator(`#row-columns-${rowId}`);
  65  | 
  66  |       await expect(collapseBtn).toBeVisible();
  67  |       await expect(columns).toBeAttached();
  68  | 
  69  |       await collapseBtn.click();
  70  | 
  71  |       await expect(collapseBtn).toHaveAttribute("aria-label", "Expand row");
  72  |       await expect(columns).not.toBeAttached();
  73  |     });
  74  | 
  75  |     test("re-expands when toggled again", async ({ page }) => {
  76  |       const rowSection = page.locator("[id^='row-section-']").first();
  77  |       const rowId = await rowSection.getAttribute("id").then((
  78  |         id: string | null,
  79  |       ) => id!.replace("row-section-", ""));
  80  |       const collapseBtn = page.locator(`#row-collapse-btn-${rowId}`);
  81  |       const columns = page.locator(`#row-columns-${rowId}`);
  82  | 
  83  |       await collapseBtn.click();
  84  |       await expect(columns).not.toBeAttached();
  85  | 
  86  |       await collapseBtn.click();
  87  | 
  88  |       await expect(columns).toBeAttached();
  89  |       await expect(collapseBtn).toHaveAttribute("aria-label", "Collapse row");
  90  |     });
  91  |   });
  92  | 
  93  |   /**
  94  |    * ChecklistSection.jsx (ChecklistGenerationCollapse) — DaisyUI collapse with
  95  |    * React-managed collapse-open class. Lives inside the task create modal.
  96  |    * IDs: #checklist-gen-collapse, #checklist-gen-collapse-toggle,
  97  |    *      #checklist-gen-collapse-content
  98  |    */
  99  |   test.describe("Checklist AI generation section (task create modal)", () => {
  100 |     test.beforeEach(async ({ page }) => {
  101 |       await page.evaluate(() => {
  102 |         (document.querySelector(
  103 |           "button:has(.hugeicons--credit-card-add)",
  104 |         ) as HTMLButtonElement)?.click();
  105 |       });
  106 |       await expect(page.getByRole("heading", { name: "Add task" }))
```