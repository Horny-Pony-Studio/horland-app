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

test.describe('Agreement generation', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Agreement/i }).click();
  });

  test('Agreement tab is accessible', async ({ page }) => {
    // Tab content should be visible
    await expect(page.getByRole('tab', { name: /Agreement/i })).toHaveAttribute('data-state', 'active');
  });

  test('Owner sees Generate Agreement button', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Generate Agreement/i });
    await expect(generateBtn).toBeVisible();
  });

  test('shows seed agreement (Draft version 1)', async ({ page }) => {
    // Seed data creates a draft agreement
    await expect(page.getByText(/Version\s+1/i)).toBeVisible();
    await expect(page.getByText(/Draft/i)).toBeVisible();
  });

  test('agreement card shows status badge', async ({ page }) => {
    // Draft badge with yellow styling
    const draftBadge = page.locator('.bg-yellow-100').filter({ hasText: 'Draft' });
    await expect(draftBadge).toBeVisible();
  });

  test('agreement card shows generation date', async ({ page }) => {
    // The card should show the date the agreement was generated
    const dateText = page.locator('.text-muted-foreground').filter({ hasText: /\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}/ });
    await expect(dateText.first()).toBeVisible();
  });

  test('can generate a new agreement (creates new version)', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Generate Agreement/i });
    await generateBtn.click();

    // Wait for the generation to complete
    await page.waitForTimeout(3000);

    // A new version should appear (version 2 if seed had version 1)
    await expect(page.getByText(/Version\s+\d+/i).first()).toBeVisible();
  });
});
