import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, SEED_COMPANY, SEED_REVENUE_RULES, SEED_PARTNERS } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Revenue rules CRUD', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    // Switch to Revenue tab
    await page.getByRole('tab', { name: /Revenue/i }).click();
  });

  test('Revenue tab shows 3 rule type sections', async ({ page }) => {
    await expect(page.getByText('Project Revenue')).toBeVisible();
    await expect(page.getByText('Client Income')).toBeVisible();
    await expect(page.getByText('Net Profit')).toBeVisible();
  });

  test('displays seed revenue rules', async ({ page }) => {
    for (const rule of SEED_REVENUE_RULES) {
      await expect(page.getByText(rule.name)).toBeVisible();
    }
  });

  test('each rule section has Add Rule button', async ({ page }) => {
    const addBtns = page.getByRole('button', { name: /Add Rule/i });
    await expect(addBtns).toHaveCount(3);
  });

  test('seed rules show partner share badges', async ({ page }) => {
    // Check that partner names appear within revenue share items
    for (const p of SEED_PARTNERS) {
      await expect(page.getByText(p.fullName).first()).toBeVisible();
    }
  });

  test('clicking Add Rule opens dialog with rule type', async ({ page }) => {
    const addBtns = page.getByRole('button', { name: /Add Rule/i });
    await addBtns.first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    // Dialog title includes the rule type
    await expect(dialog.locator('h2')).toContainText(/Project Revenue/i);
  });

  test('dialog has rule name input and partner percentage fields', async ({ page }) => {
    const addBtns = page.getByRole('button', { name: /Add Rule/i });
    await addBtns.first().click();
    const dialog = page.locator('[role="dialog"]');

    // Rule name input
    await expect(dialog.locator('input').first()).toBeVisible();
    // Partner percentage inputs (one per partner = 3)
    const numInputs = dialog.locator('input[type="number"]');
    await expect(numInputs).toHaveCount(SEED_PARTNERS.length);
  });

  test('dialog shows live sum counter', async ({ page }) => {
    const addBtns = page.getByRole('button', { name: /Add Rule/i });
    await addBtns.first().click();
    const dialog = page.locator('[role="dialog"]');

    // Shows "0.0% / 100%"  initially
    await expect(dialog.getByText('0.0% / 100%')).toBeVisible();

    // Type a value and check sum updates
    const firstInput = dialog.locator('input[type="number"]').first();
    await firstInput.fill('50');
    await expect(dialog.getByText('50.0% / 100%')).toBeVisible();
  });

  test('Edit button opens dialog with pre-filled values', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /^Edit$/ }).first();
    await editBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    // Rule name should be pre-filled
    const nameInput = dialog.locator('input').first();
    await expect(nameInput).not.toHaveValue('');
  });

  test('sum counter turns green at 100%', async ({ page }) => {
    const addBtns = page.getByRole('button', { name: /Add Rule/i });
    await addBtns.first().click();
    const dialog = page.locator('[role="dialog"]');

    // Fill partner shares that sum to 100
    const inputs = dialog.locator('input[type="number"]');
    const count = await inputs.count();
    if (count >= 3) {
      await inputs.nth(0).fill('50');
      await inputs.nth(1).fill('30');
      await inputs.nth(2).fill('20');
    }

    // The sum text should have emerald/green color
    const sumText = dialog.getByText('100.0% / 100%');
    await expect(sumText).toBeVisible();
    await expect(sumText).toHaveClass(/text-emerald-600/);
  });
});
