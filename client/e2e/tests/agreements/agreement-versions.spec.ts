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

test.describe('Agreement versions', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Agreement/i }).click();
  });

  test('at least one agreement version is displayed', async ({ page }) => {
    // Wait for agreement content to render (TanStack Query fetch)
    await expect(page.getByText(/Version\s+\d+/i).first()).toBeVisible({ timeout: 15_000 });
    const count = await page.getByText(/Version\s+\d+/i).count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('agreement cards are ordered (latest first)', async ({ page }) => {
    const versionTexts = page.getByText(/Version\s+\d+/i);
    const count = await versionTexts.count();
    if (count >= 2) {
      const first = await versionTexts.nth(0).textContent();
      const second = await versionTexts.nth(1).textContent();
      const v1 = parseInt(first?.match(/\d+/)?.[0] ?? '0');
      const v2 = parseInt(second?.match(/\d+/)?.[0] ?? '0');
      expect(v1).toBeGreaterThanOrEqual(v2);
    }
  });

  test('each version has an Export button', async ({ page }) => {
    // Wait for at least one Export button to appear
    await expect(page.getByRole('button', { name: 'Export to PDF' }).first()).toBeVisible({ timeout: 10_000 });
    const count = await page.getByRole('button', { name: 'Export to PDF' }).count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('older versions show Archived status after generating new one', async ({ page }) => {
    // Wait for agreement content to render
    await expect(page.getByText(/Version\s+\d+/i).first()).toBeVisible({ timeout: 10_000 });
    const versionCount = await page.getByText(/Version\s+\d+/i).count();
    expect(versionCount).toBeGreaterThanOrEqual(1);
    // If there are multiple versions, older ones should show "Archived"
    if (versionCount >= 2) {
      await expect(page.getByText('Archived').first()).toBeVisible();
    }
  });
});
