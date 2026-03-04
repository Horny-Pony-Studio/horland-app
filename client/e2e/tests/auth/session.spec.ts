import { test, expect } from '@playwright/test';
import { OWNER } from '../../helpers/test-data';

test.describe('Session / Auth guard', () => {
  test('unauthenticated user is redirected from /companies to /login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/en/companies');
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  test('authenticated user sees their name in the header', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    // Owner's fullName from seed data
    await expect(page.locator('header')).toContainText(OWNER.fullName);
  });

  test('authenticated user can access /companies without redirect', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/en\/companies/);
    await expect(page.locator('h1')).toContainText('My Companies');
  });
});
