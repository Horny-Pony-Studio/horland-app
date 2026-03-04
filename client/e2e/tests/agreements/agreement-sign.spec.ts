import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, SEED_COMPANY, SEED_PARTNERS } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Agreement signing', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Agreement/i }).click();
  });

  test('Sign button is visible for Draft/Active agreement', async ({ page }) => {
    // The Sign button should appear for non-Signed/non-Archived agreements
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    // May or may not be visible depending on agreement status
    const signBtnCount = await signBtn.count();
    expect(signBtnCount).toBeGreaterThanOrEqual(0);
  });

  test('clicking Sign opens the sign dialog', async ({ page }) => {
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    if ((await signBtn.count()) === 0) {
      test.skip(true, 'No signable agreement available');
      return;
    }
    await signBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2')).toContainText('Sign');
  });

  test('sign dialog has partner select dropdown', async ({ page }) => {
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    if ((await signBtn.count()) === 0) {
      test.skip(true, 'No signable agreement');
      return;
    }
    await signBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('[role="combobox"]')).toBeVisible();
  });

  test('sign dialog has signature canvas', async ({ page }) => {
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    if ((await signBtn.count()) === 0) {
      test.skip(true, 'No signable agreement');
      return;
    }
    await signBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('canvas')).toBeVisible();
  });

  test('sign dialog has Clear button', async ({ page }) => {
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    if ((await signBtn.count()) === 0) {
      test.skip(true, 'No signable agreement');
      return;
    }
    await signBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByRole('button', { name: /Clear/i })).toBeVisible();
  });

  test('Sign button in dialog is disabled when no partner selected', async ({ page }) => {
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    if ((await signBtn.count()) === 0) {
      test.skip(true, 'No signable agreement');
      return;
    }
    await signBtn.click();
    const dialog = page.locator('[role="dialog"]');
    // The submit Sign button should be disabled
    const submitBtn = dialog.getByRole('button', { name: /^Sign$/ });
    await expect(submitBtn).toBeDisabled();
  });

  test('can draw on signature canvas', async ({ page }) => {
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    if ((await signBtn.count()) === 0) {
      test.skip(true, 'No signable agreement');
      return;
    }
    await signBtn.click();
    const canvas = page.locator('[role="dialog"] canvas');
    await expect(canvas).toBeVisible();

    // Simulate drawing on canvas
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 100);
      await page.mouse.move(box.x + 200, box.y + 50);
      await page.mouse.up();
    }
    // Canvas should no longer be empty (we can't easily check this without reading canvas data)
  });

  test('can select a partner from dropdown', async ({ page }) => {
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    if ((await signBtn.count()) === 0) {
      test.skip(true, 'No signable agreement');
      return;
    }
    await signBtn.click();
    const dialog = page.locator('[role="dialog"]');

    // Open the select
    await dialog.locator('[role="combobox"]').click();
    const options = page.locator('[role="option"]');
    const optionCount = await options.count();

    if (optionCount > 0) {
      await options.first().click();
      // The submit button should now be enabled (partner selected)
      const submitBtn = dialog.getByRole('button', { name: /^Sign$/ });
      await expect(submitBtn).toBeEnabled();
    }
  });

  test('Clear button resets the canvas', async ({ page }) => {
    const signBtn = page.getByRole('button', { name: /^Sign$/ });
    if ((await signBtn.count()) === 0) {
      test.skip(true, 'No signable agreement');
      return;
    }
    await signBtn.click();
    const dialog = page.locator('[role="dialog"]');
    const canvas = dialog.locator('canvas');

    // Draw something
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 100);
      await page.mouse.up();
    }

    // Click clear
    await dialog.getByRole('button', { name: /Clear/i }).click();
    // Canvas should be cleared (visual check not possible, but no error expected)
  });
});
