import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } }); // unauthenticated

test.describe('Welcome page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
  });

  test('displays HORAND branding and logo', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('HORAND');
    await expect(page.getByText('Partnership', { exact: true })).toBeVisible();
    // "H" logo icon
    await expect(page.getByText('H', { exact: true }).first()).toBeVisible();
  });

  test('shows welcome description', async ({ page }) => {
    await expect(page.getByText('Platform for creating partnership agreements between co-owners')).toBeVisible();
  });

  test('has Sign In button that navigates to login', async ({ page }) => {
    const signInBtn = page.locator('a[href*="/login"] button');
    await expect(signInBtn).toBeVisible();
    await expect(signInBtn).toHaveText('Sign In');
    await signInBtn.click();
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test('has Sign Up button that navigates to signup', async ({ page }) => {
    const signUpBtn = page.locator('a[href*="/signup"] button');
    await expect(signUpBtn).toBeVisible();
    await expect(signUpBtn).toHaveText('Sign Up');
    await signUpBtn.click();
    await expect(page).toHaveURL(/\/en\/signup/);
  });

  test('language switcher is visible', async ({ page }) => {
    // On /en page, switcher should show "UA" to switch to Ukrainian
    const switcher = page.locator('button').filter({ hasText: /^UA$/ });
    await expect(switcher).toBeVisible();
  });
});
