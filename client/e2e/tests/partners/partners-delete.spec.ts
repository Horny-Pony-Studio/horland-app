import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, EDITOR, SEED_COMPANY } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Partner deletion', () => {
  test('Delete button is visible for Owner', async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.getByRole('button', { name: /^Delete$/ }).first();
    await expect(deleteBtn).toBeVisible();
  });

  test('clicking Delete shows confirmation dialog', async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');

    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');

    // Use an existing seed partner — just test that the confirm dialog appears
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss(); // Cancel deletion to keep seed data intact
    });

    // Click delete on first available partner
    const deleteBtn = page.locator('.text-destructive').filter({ hasText: /^Delete$/ }).first();
    await deleteBtn.click();
    expect(dialogAppeared).toBeTruthy();
  });

  test('Editor does not see Delete button', async ({ browser }) => {
    test.skip(!companyId, 'Seed company not found');

    const context = await browser.newContext({
      storageState: 'auth/editor-storage.json',
    });
    const page = await context.newPage();
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');

    // Editor should not see Delete buttons (only Edit)
    const deleteButtons = page.locator('.text-destructive').filter({ hasText: /^Delete$/ });
    await expect(deleteButtons).toHaveCount(0);

    await context.close();
  });
});
