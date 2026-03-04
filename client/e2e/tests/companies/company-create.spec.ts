import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER } from '../../helpers/test-data';

test.describe('Company creation', () => {
  const createdCompanyNames: string[] = [];

  test.afterAll(async () => {
    // Clean up created test companies via API
    const api = new ApiClient();
    await api.login(OWNER.email, OWNER.password);
    const companies = await api.getCompanies();
    for (const c of companies) {
      if (createdCompanyNames.includes(c.name)) {
        await api.deleteCompany(c.id);
      }
    }
  });

  test('Create Company button opens dialog', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Company' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] h2')).toContainText('Create Company');
  });

  test('dialog has name input, type select, and save button', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Company' }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('input')).toBeVisible();
    await expect(dialog.locator('[role="combobox"]')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('save button is disabled when name is empty', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Company' }).click();
    const saveBtn = page.locator('[role="dialog"]').getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeDisabled();
  });

  test('can create a Company type', async ({ page }) => {
    const name = `E2E Company ${Date.now()}`;
    createdCompanyNames.push(name);

    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Company' }).click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input').fill(name);
    // Type defaults to "Company"
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Dialog should close
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    // New company appears in list
    await expect(page.getByText(name)).toBeVisible();
  });

  test('can create a Project type', async ({ page }) => {
    const name = `E2E Project ${Date.now()}`;
    createdCompanyNames.push(name);

    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Company' }).click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input').fill(name);

    // Open type select and pick "Project"
    await dialog.locator('[role="combobox"]').click();
    await page.locator('[role="option"]').filter({ hasText: 'Project' }).click();

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(name)).toBeVisible();
  });
});
