import { test as setup } from '@playwright/test';
import { EDITOR } from '../helpers/test-data';

setup('authenticate as Editor', async ({ page }) => {
  await page.goto('/en/login');
  await page.locator('#email').fill(EDITOR.email);
  await page.locator('#password').fill(EDITOR.password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to companies page
  await page.waitForURL('**/companies', { timeout: 15_000 });

  await page.context().storageState({ path: 'auth/editor-storage.json' });
});
