import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, SEED_COMPANY, SEED_PARTNERS } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Revenue validation', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Revenue/i }).click();
  });

  test('saving without rule name shows required error', async ({ page }) => {
    await page.getByRole('button', { name: /Add Rule/i }).first().click();
    const dialog = page.locator('[role="dialog"]');

    // Fill shares summing to 100 but leave name empty
    const inputs = dialog.locator('input[type="number"]');
    if ((await inputs.count()) >= 3) {
      await inputs.nth(0).fill('50');
      await inputs.nth(1).fill('30');
      await inputs.nth(2).fill('20');
    }
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.locator('.bg-destructive\\/10')).toBeVisible();
  });

  test('saving with shares not summing to 100% shows error', async ({ page }) => {
    await page.getByRole('button', { name: /Add Rule/i }).first().click();
    const dialog = page.locator('[role="dialog"]');

    await dialog.locator('input').first().fill('Test Rule');
    const inputs = dialog.locator('input[type="number"]');
    if ((await inputs.count()) >= 3) {
      await inputs.nth(0).fill('30');
      await inputs.nth(1).fill('30');
      await inputs.nth(2).fill('20'); // sum = 80, not 100
    }
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.locator('.bg-destructive\\/10')).toContainText(/100%|дорівнювати/i);
  });

  test('sum counter shows red when not 100%', async ({ page }) => {
    await page.getByRole('button', { name: /Add Rule/i }).first().click();
    const dialog = page.locator('[role="dialog"]');

    const inputs = dialog.locator('input[type="number"]');
    await inputs.first().fill('50');
    const sumText = dialog.getByText('50.0% / 100%');
    await expect(sumText).toHaveClass(/text-destructive/);
  });

  test('can successfully save a rule with 100% shares', async ({ page }) => {
    const ruleName = `E2E-Rule-${Date.now()}`;
    await page.getByRole('button', { name: /Add Rule/i }).first().click();
    const dialog = page.locator('[role="dialog"]');

    await dialog.locator('input').first().fill(ruleName);
    const inputs = dialog.locator('input[type="number"]');
    const count = await inputs.count();
    if (count >= 3) {
      await inputs.nth(0).fill('50');
      await inputs.nth(1).fill('30');
      await inputs.nth(2).fill('20');
    }
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // The new rule should appear in the list
    await expect(page.getByText(ruleName)).toBeVisible();

    // Clean up via API
    const api = new ApiClient();
    await api.login(OWNER.email, OWNER.password);
    const rules = await api.getRevenueRules(companyId);
    const created = rules.find((r: any) => r.name === ruleName);
    if (created) await api.deleteRevenueRule(companyId, created.id);
  });
});
