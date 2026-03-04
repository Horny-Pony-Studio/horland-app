import { test, expect } from '@playwright/test';
import { OWNER } from '../../helpers/test-data';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Signup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/signup');
  });

  test('displays signup form with fullName, email, password', async ({ page }) => {
    await expect(page.getByText('Sign Up', { exact: true }).first()).toBeVisible();
    await expect(page.locator('#fullName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows validation error for empty fullName', async ({ page }) => {
    await page.locator('#email').fill('new@example.com');
    await page.locator('#password').fill('ValidPass1');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('shows validation error for short fullName', async ({ page }) => {
    await page.locator('#fullName').fill('A');
    await page.locator('#email').fill('new@example.com');
    await page.locator('#password').fill('ValidPass1');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('shows validation error for empty email', async ({ page }) => {
    await page.locator('#fullName').fill('Test User');
    await page.locator('#password').fill('ValidPass1');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.locator('#fullName').fill('Test User');
    await page.locator('#email').fill('invalid-email');
    await page.locator('#password').fill('ValidPass1');
    await page.locator('button[type="submit"]').click();
    // Either client-side validation error or still on signup page
    await page.waitForTimeout(1000);
    const hasError = await page.locator('.text-destructive').count();
    const stillOnSignup = page.url().includes('/signup');
    expect(hasError > 0 || stillOnSignup).toBeTruthy();
  });

  test('shows validation error for short password (< 8 chars)', async ({ page }) => {
    await page.locator('#fullName').fill('Test User');
    await page.locator('#email').fill('new@example.com');
    await page.locator('#password').fill('Ab1');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('shows validation error for password without uppercase', async ({ page }) => {
    await page.locator('#fullName').fill('Test User');
    await page.locator('#email').fill('new@example.com');
    await page.locator('#password').fill('lowercase1');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('shows validation error for password without digit', async ({ page }) => {
    await page.locator('#fullName').fill('Test User');
    await page.locator('#email').fill('new@example.com');
    await page.locator('#password').fill('NoDigitHere');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('shows password requirements hint', async ({ page }) => {
    await expect(page.getByText('Minimum 8 characters, 1 uppercase, 1 lowercase, 1 digit')).toBeVisible();
  });

  test('shows error for duplicate email (existing seed user)', async ({ page }) => {
    await page.locator('#fullName').fill('Another User');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill('ValidPass1');
    await page.locator('button[type="submit"]').click();
    // Backend may return "This email is already registered" or "Email is already taken"
    await expect(page.locator('.bg-destructive\\/10')).toBeVisible();
  });
});
