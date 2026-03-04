import { test, expect } from '@playwright/test';

test.describe('Locale switching — English', () => {
  test('welcome page shows English content at /en', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Platform for creating partnership agreements')).toBeVisible();
    await expect(page.locator('a[href*="/login"] button')).toHaveText('Sign In');
    await expect(page.locator('a[href*="/signup"] button')).toHaveText('Sign Up');
  });

  test('login page shows English labels at /en/login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/en/login');
    // Use getByText since CardTitle renders as generic div
    await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible();
    await expect(page.locator('label[for="email"]')).toHaveText('Email');
    await expect(page.locator('label[for="password"]')).toHaveText('Password');
    await context.close();
  });

  test('companies page shows English labels', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('My Companies');
    await expect(page.getByRole('button', { name: 'Create Company' })).toBeVisible();
  });

  test('header shows English Sign Out button', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Sign Out/i })).toBeVisible();
  });
});

test.describe('Locale switching — Ukrainian', () => {
  test('welcome page shows Ukrainian content at /uk', async ({ page }) => {
    await page.goto('/uk');
    await expect(page.getByText('Платформа для укладення договорів')).toBeVisible();
    await expect(page.locator('a[href*="/login"] button')).toHaveText('Увійти');
    await expect(page.locator('a[href*="/signup"] button')).toHaveText('Зареєструватися');
  });

  test('login page shows Ukrainian labels at /uk/login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/uk/login');
    await expect(page.getByText('Вхід в систему').first()).toBeVisible();
    await expect(page.locator('label[for="email"]')).toHaveText('Електронна пошта');
    await expect(page.locator('label[for="password"]')).toHaveText('Пароль');
    await context.close();
  });

  test('companies page shows Ukrainian labels', async ({ page }) => {
    await page.goto('/uk/companies');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Мої компанії');
  });
});

test.describe('Locale switching — Toggle', () => {
  test('clicking language switcher on welcome page toggles locale', async ({ page }) => {
    await page.goto('/en');
    // On /en, switcher shows "UA"
    const switcher = page.locator('button').filter({ hasText: /^UA$/ });
    await expect(switcher).toBeVisible();
    await switcher.click();
    // Should navigate to /uk
    await expect(page).toHaveURL(/\/uk\/?$/);
    await expect(page.getByText('Платформа для укладення договорів')).toBeVisible();
  });

  test('clicking language switcher on UK page switches to EN', async ({ page }) => {
    await page.goto('/uk');
    // On /uk, switcher shows "EN"
    const switcher = page.locator('button').filter({ hasText: /^EN$/ });
    await expect(switcher).toBeVisible();
    await switcher.click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByText('Platform for creating partnership agreements')).toBeVisible();
  });

  test('root URL redirects to a locale', async ({ page }) => {
    await page.goto('/');
    // Should redirect to /uk/ (default) or /en/ (if cookie/browser preference)
    await expect(page).toHaveURL(/\/(uk|en)\/?/);
  });
});
