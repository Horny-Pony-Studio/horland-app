import { test, expect } from '@playwright/test';

// Uses owner storageState from config (authenticated)

test.describe('Logout', () => {
  test('clicking Sign Out redirects to login page', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');

    const logoutBtn = page.getByRole('button', { name: /Sign Out/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test('after logout, visiting /companies redirects to login', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Sign Out/i }).click();
    await page.waitForURL('**/login', { timeout: 10_000 });

    // Try navigating back to companies
    await page.goto('/en/companies');
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
