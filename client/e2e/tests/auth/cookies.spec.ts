import { test, expect } from '@playwright/test';
import { OWNER } from '../../helpers/test-data';

test.use({ storageState: { cookies: [], origins: [] } }); // start unauthenticated

test.describe('Auth cookies', () => {
  test('login sets accessToken and refreshToken cookies', async ({ page, context }) => {
    await page.goto('/en/login');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });

    const cookies = await context.cookies();
    const accessToken = cookies.find((c) => c.name === 'accessToken');
    const refreshToken = cookies.find((c) => c.name === 'refreshToken');

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
  });

  test('cookies are HttpOnly', async ({ page, context }) => {
    await page.goto('/en/login');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });

    const cookies = await context.cookies();
    const accessToken = cookies.find((c) => c.name === 'accessToken');
    const refreshToken = cookies.find((c) => c.name === 'refreshToken');

    expect(accessToken?.httpOnly).toBe(true);
    expect(refreshToken?.httpOnly).toBe(true);
  });

  test('cookies are NOT Secure (HTTP-compatible)', async ({ page, context }) => {
    await page.goto('/en/login');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });

    const cookies = await context.cookies();
    const accessToken = cookies.find((c) => c.name === 'accessToken');
    const refreshToken = cookies.find((c) => c.name === 'refreshToken');

    expect(accessToken?.secure).toBe(false);
    expect(refreshToken?.secure).toBe(false);
  });

  test('cookies are not accessible via document.cookie (HttpOnly)', async ({ page }) => {
    await page.goto('/en/login');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });

    const jsCookies = await page.evaluate(() => document.cookie);
    expect(jsCookies).not.toContain('accessToken');
    expect(jsCookies).not.toContain('refreshToken');
  });

  test('accessToken expires in ~15 minutes', async ({ page, context }) => {
    await page.goto('/en/login');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });

    const cookies = await context.cookies();
    const accessToken = cookies.find((c) => c.name === 'accessToken');
    expect(accessToken).toBeDefined();

    const expiresIn = accessToken!.expires - Date.now() / 1000;
    // Should expire within 10–20 minutes (600–1200 seconds)
    expect(expiresIn).toBeGreaterThan(600);
    expect(expiresIn).toBeLessThan(1200);
  });

  test('refreshToken expires in ~7 days', async ({ page, context }) => {
    await page.goto('/en/login');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });

    const cookies = await context.cookies();
    const refreshToken = cookies.find((c) => c.name === 'refreshToken');
    expect(refreshToken).toBeDefined();

    const expiresIn = refreshToken!.expires - Date.now() / 1000;
    // Should expire within 6–8 days (518400–691200 seconds)
    expect(expiresIn).toBeGreaterThan(518400);
    expect(expiresIn).toBeLessThan(691200);
  });

  test('authenticated request works with cookies (GET /api/auth/me)', async ({ page }) => {
    await page.goto('/en/login');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });

    // Make API call from browser context — cookies sent automatically
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('demo@horand.com');
  });

  test('logout clears cookies', async ({ page, context }) => {
    await page.goto('/en/login');
    await page.locator('#email').fill(OWNER.email);
    await page.locator('#password').fill(OWNER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/companies', { timeout: 15_000 });

    // Verify cookies exist
    let cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'accessToken')).toBeDefined();

    // Logout
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await page.waitForURL('**/login', { timeout: 10_000 });

    // Cookies should be cleared
    cookies = await context.cookies();
    const accessToken = cookies.find((c) => c.name === 'accessToken');
    const refreshToken = cookies.find((c) => c.name === 'refreshToken');
    // Cookies are either removed or expired
    expect(!accessToken || accessToken.expires < Date.now() / 1000).toBeTruthy();
    expect(!refreshToken || refreshToken.expires < Date.now() / 1000).toBeTruthy();
  });
});
