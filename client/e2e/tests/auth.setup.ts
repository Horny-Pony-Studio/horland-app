import { test as setup } from '@playwright/test';
import { OWNER } from '../helpers/test-data';

setup('authenticate as Owner', async ({ page }) => {
  await page.goto('/en/login');
  await page.locator('#email').fill(OWNER.email);
  await page.locator('#password').fill(OWNER.password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to companies page
  await page.waitForURL('**/companies', { timeout: 15_000 });

  await page.context().storageState({ path: 'auth/owner-storage.json' });
});
