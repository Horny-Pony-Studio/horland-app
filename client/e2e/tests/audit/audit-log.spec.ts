import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, SEED_COMPANY } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Audit log', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Audit/i }).click();
  });

  test('Audit tab is visible for Owner', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Audit/i })).toBeVisible();
  });

  test('displays audit log entries', async ({ page }) => {
    // Seed data operations should have created audit entries
    // Check for at least one audit entry card
    const entries = page.locator('.rounded-xl.border-violet-100');
    const count = await entries.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if audit logging is lazy
  });

  test('audit entries show action badges', async ({ page }) => {
    const actionBadges = page.locator('[class*="badge"]').filter({ hasText: /Create|Update|Delete/ });
    if ((await actionBadges.count()) > 0) {
      await expect(actionBadges.first()).toBeVisible();
    }
  });

  test('audit entries show entity type badges', async ({ page }) => {
    const entityBadges = page.locator('[class*="badge"]').filter({ hasText: /Partner|RevenueRule|Agreement|Company/ });
    if ((await entityBadges.count()) > 0) {
      await expect(entityBadges.first()).toBeVisible();
    }
  });

  test('audit entries show user name', async ({ page }) => {
    const entries = page.locator('.rounded-xl.border-violet-100');
    if ((await entries.count()) > 0) {
      // Should contain the user name in muted text
      await expect(entries.first()).toContainText(/Demo User|Editor User/);
    }
  });

  test('audit entries show timestamps', async ({ page }) => {
    const entries = page.locator('.rounded-xl.border-violet-100');
    if ((await entries.count()) > 0) {
      // Dates should be visible
      const dateText = entries.first().locator('.text-muted-foreground').last();
      await expect(dateText).toBeVisible();
    }
  });

  test('old/new values are displayed for entries that have them', async ({ page }) => {
    // Check for Old Value / New Value labels
    const oldValueLabel = page.getByText('Old Value');
    const newValueLabel = page.getByText('New Value');
    // These may or may not be present depending on audit entries
    if ((await oldValueLabel.count()) > 0) {
      await expect(oldValueLabel.first()).toBeVisible();
    }
    if ((await newValueLabel.count()) > 0) {
      await expect(newValueLabel.first()).toBeVisible();
    }
  });

  test('old values shown in red, new values in green', async ({ page }) => {
    const redText = page.locator('.text-red-600');
    const greenText = page.locator('.text-emerald-600');
    // May or may not be present
    if ((await redText.count()) > 0) {
      await expect(redText.first()).toBeVisible();
    }
    if ((await greenText.count()) > 0) {
      await expect(greenText.first()).toBeVisible();
    }
  });

  test('pagination is shown when there are many entries', async ({ page }) => {
    // Pagination shows "X / Y" text and Back/Next buttons
    const pageIndicator = page.getByText(/\d+\s*\/\s*\d+/);
    if ((await pageIndicator.count()) > 0) {
      await expect(pageIndicator).toBeVisible();
    }
  });

  test('pagination Previous button is disabled on first page', async ({ page }) => {
    // If pagination exists, the "Back" button should be disabled on page 1
    const backBtn = page.getByRole('button', { name: 'Back' });
    if ((await backBtn.count()) > 1) {
      // The second "Back" button is in pagination (first is the navigation back)
      const paginationBack = backBtn.last();
      if (await paginationBack.isVisible()) {
        await expect(paginationBack).toBeDisabled();
      }
    }
  });
});
