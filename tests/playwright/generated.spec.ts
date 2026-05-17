import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

test('test', async ({ page }) => {
  await page.goto('https://kanary.local.dev/');
  await page.locator('#board-config-collapse-toggle').check();
  await page.getByRole('textbox', { name: 'A project name, a category' }).dblclick();
  await page.getByRole('textbox', { name: 'A project name, a category' }).dblclick();
  await page.getByRole('textbox', { name: 'A project name, a category' }).fill('pizza');
  await page.getByRole('textbox', { name: 'A project name, a category' }).press('Tab');
  await page.getByRole('textbox', { name: 'Describe the tasks to generate' }).fill('make a pizza');
  await page.getByRole('button', { name: 'Add Row' }).click();
});