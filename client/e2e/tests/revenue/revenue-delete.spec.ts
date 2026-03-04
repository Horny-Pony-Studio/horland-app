import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, EDITOR, SEED_COMPANY, SEED_PARTNERS } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Revenue rule deletion', () => {
  test('Owner sees Delete buttons on rules', async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Revenue/i }).click();

    const deleteBtn = page.locator('.text-destructive').filter({ hasText: /^Delete$/ }).first();
    await expect(deleteBtn).toBeVisible();
  });

  test('clicking Delete shows confirmation and can be cancelled', async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Revenue/i }).click();

    // Create a throwaway rule for deletion test
    const api = new ApiClient();
    await api.login(OWNER.email, OWNER.password);
    const partners = await api.getPartners(companyId);
    const shares = partners.map((p: any, i: number) => ({
      partnerId: p.id,
      percentage: i === 0 ? 60 : i === 1 ? 30 : 10,
    }));
    const rule = await api.createRevenueRule(companyId, 'Project', `Delete-Me-Rule-${Date.now()}`, shares);

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Revenue/i }).click();

    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss(); // Cancel
    });

    const ruleSection = page.locator('div').filter({ hasText: rule.name });
    const deleteBtn = ruleSection.locator('.text-destructive').filter({ hasText: /^Delete$/ });
    await deleteBtn.first().click();

    // Rule should still be visible after cancelling
    await expect(page.getByText(rule.name)).toBeVisible();

    // Clean up
    await api.deleteRevenueRule(companyId, rule.id);
  });

  test('Editor does not see Delete buttons on revenue rules', async ({ browser }) => {
    test.skip(!companyId, 'Seed company not found');
    const context = await browser.newContext({
      storageState: 'auth/editor-storage.json',
    });
    const page = await context.newPage();
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Revenue/i }).click();

    const deleteButtons = page.locator('.text-destructive').filter({ hasText: /^Delete$/ });
    await expect(deleteButtons).toHaveCount(0);

    await context.close();
  });
});
