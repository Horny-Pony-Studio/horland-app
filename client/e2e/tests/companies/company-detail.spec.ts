import { test, expect } from '@playwright/test';
import { SEED_COMPANY } from '../../helpers/test-data';
import { ApiClient } from '../../helpers/api-client';
import { OWNER } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Company detail page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
  });

  test('shows company name and type badge', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(SEED_COMPANY.name);
    // Type badge (Company) is visible somewhere on the page
    await expect(page.getByText('Company', { exact: true }).first()).toBeVisible();
  });

  test('shows Owner role badge', async ({ page }) => {
    await expect(page.getByText('Owner', { exact: true })).toBeVisible();
  });

  test('displays 4 tabs: Partners, Revenue, Agreement, Audit', async ({ page }) => {
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList.getByRole('tab', { name: 'Partners', exact: true })).toBeVisible();
    await expect(tabList.getByRole('tab', { name: /Revenue Distribution/i })).toBeVisible();
    await expect(tabList.getByRole('tab', { name: /Partnership Agreement/i })).toBeVisible();
    await expect(tabList.getByRole('tab', { name: /Audit Log/i })).toBeVisible();
  });

  test('Partners tab is selected by default', async ({ page }) => {
    const partnersTab = page.getByRole('tab', { name: 'Partners', exact: true });
    await expect(partnersTab).toHaveAttribute('data-state', 'active');
  });

  test('Back button navigates to companies list', async ({ page }) => {
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/en\/companies$/);
  });

  test('shows total shares and partner count info', async ({ page }) => {
    await expect(page.getByText(/Total Shares/).first()).toBeVisible();
    await expect(page.getByText(/3\s+partners/i)).toBeVisible();
  });
});
