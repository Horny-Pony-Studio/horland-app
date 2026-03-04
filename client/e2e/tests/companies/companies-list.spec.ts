import { test, expect } from '@playwright/test';
import { SEED_COMPANY } from '../../helpers/test-data';

test.describe('Companies list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
  });

  test('displays page title "My Companies"', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('My Companies');
  });

  test('shows the seed company card', async ({ page }) => {
    await expect(page.getByText(SEED_COMPANY.name)).toBeVisible();
  });

  test('company card shows type, role badge, and partner count', async ({ page }) => {
    const card = page.locator(`a[href*="companies/"]`).filter({ hasText: SEED_COMPANY.name });
    await expect(card).toBeVisible();
    // Type label
    await expect(card).toContainText('Company');
    // Role badge: Owner
    await expect(card).toContainText('Owner');
    // Partners count (3 seed partners)
    await expect(card).toContainText('3');
  });

  test('clicking a company card navigates to detail page', async ({ page }) => {
    const card = page.locator(`a[href*="companies/"]`).filter({ hasText: SEED_COMPANY.name });
    await card.click();
    await expect(page).toHaveURL(/\/en\/companies\/[a-f0-9-]+/);
    // Detail page shows company name
    await expect(page.locator('h1')).toContainText(SEED_COMPANY.name);
  });
});
