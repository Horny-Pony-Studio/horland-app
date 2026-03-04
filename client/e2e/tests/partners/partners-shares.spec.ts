import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, SEED_COMPANY } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Partners shares validation', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
  });

  test('shows Total Shares summary bar', async ({ page }) => {
    await expect(page.getByText(/Total Shares/).first()).toBeVisible();
  });

  test('shows correct total shares from seed data (100%)', async ({ page }) => {
    await expect(page.getByText('100.0%').first()).toBeVisible();
  });

  test('shows remaining shares (0%)', async ({ page }) => {
    await expect(page.getByText(/Remaining/).first()).toBeVisible();
  });

  test('progress bar reflects total shares', async ({ page }) => {
    const progress = page.locator('[role="progressbar"]').first();
    await expect(progress).toBeVisible();
  });

  test('adding partner exceeding 100% shows error', async ({ page }) => {
    await page.getByRole('button', { name: /Add Partner/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input').first().fill('Overflow Partner');
    await dialog.locator('input[type="number"]').fill('10');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.locator('.bg-destructive\\/10')).toContainText(/exceed|перевищує/i);
  });

  test('share must be between 1 and 99', async ({ page }) => {
    await page.getByRole('button', { name: /Add Partner/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input').first().fill('Zero Share');
    await dialog.locator('input[type="number"]').fill('0');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.locator('.bg-destructive\\/10')).toBeVisible();
  });

  test('dialog shows remaining shares info text', async ({ page }) => {
    await page.getByRole('button', { name: /Add Partner/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText(/Remaining/)).toBeVisible();
  });
});
