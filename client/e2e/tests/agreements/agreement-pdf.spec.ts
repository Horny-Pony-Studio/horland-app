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

test.describe('Agreement PDF export', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Agreement/i }).click();
  });

  test('Export to PDF button is visible when agreement exists', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /Export to PDF/i }).first();
    await expect(exportBtn).toBeVisible();
  });

  test('clicking Export triggers a download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    const exportBtn = page.getByRole('button', { name: /Export to PDF/i }).first();
    await exportBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('agreement');
  });

  test('downloaded file is a valid PDF', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await page.getByRole('button', { name: /Export to PDF/i }).first().click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    // Read first bytes to verify PDF magic bytes
    const fs = await import('fs');
    if (path) {
      const buffer = fs.readFileSync(path);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      const header = buffer.subarray(0, 4).toString();
      expect(header).toBe('%PDF');
    }
  });
});
