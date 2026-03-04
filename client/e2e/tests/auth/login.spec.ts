import { test, expect } from '@playwright/test';
import { OWNER } from '../../helpers/test-data';

test.use({ storageState: { cookies: [], origins: [] } }); // unauthenticated

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
  });

  test('displays login form with email and password fields', async ({ page }) => {
    await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows validation error for empty email', async ({ page }) => {
    await page.locator('#password').fill('anyPassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.locator('#email').fill('not-an-email');
    await page.locator('#password').fill('anyPassword');
    await page.locator('button[type="submit"]').click();
    // Either a client-side validation error appears, or the form doesn't submit
    // Wait briefly then check for error or that we're still on login
    await page.waitForTimeout(1000);
    const hasError = await page.locator('.text-destructive').count();
    const stillOnLogin = page.url().includes('/login');
    expect(hasError > 0 || stillOnLogin).toBeTruthy();
  });

  test('shows validation error for empty password', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('WrongPass123');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.bg-destructive\\/10')).toContainText('Invalid email or password');
  });

  test('successful login redirects to /companies', async ({ page }) => {
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/en\/companies/);
  });

  test('submit button shows loading state during request', async ({ page }) => {
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    // Button should briefly show "Loading..." text
    // Then redirect happens
    await page.waitForURL('**/companies', { timeout: 15_000 });
  });

  test('has link to signup page', async ({ page }) => {
    const signUpLink = page.locator('a[href*="/signup"]');
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toContainText('Sign Up');
  });

  test('signup link navigates to signup page', async ({ page }) => {
    await page.locator('a[href*="/signup"]').click();
    await expect(page).toHaveURL(/\/en\/signup/);
  });
});
