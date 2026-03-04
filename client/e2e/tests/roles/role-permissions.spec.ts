import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, EDITOR, SEED_COMPANY } from '../../helpers/test-data';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;
});

test.describe('Role permissions — Owner UI', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
  });

  test('Owner sees "Owner" role badge', async ({ page }) => {
    await expect(page.getByText('Owner', { exact: true })).toBeVisible();
  });

  test('Owner sees Add Partner button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Add Partner/i })).toBeVisible();
  });

  test('Owner sees Edit and Delete buttons on partners', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Edit$/ }).first()).toBeVisible();
    await expect(page.locator('.text-destructive').filter({ hasText: /^Delete$/ }).first()).toBeVisible();
  });

  test('Owner sees Generate Agreement button', async ({ page }) => {
    await page.getByRole('tab', { name: /Partnership Agreement/i }).click();
    await expect(page.getByRole('button', { name: /Generate Agreement/i })).toBeVisible();
  });

  test('Owner sees Audit tab', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Audit/i })).toBeVisible();
  });

  test('Owner sees Add Rule button on revenue tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Revenue/i }).click();
    await expect(page.getByRole('button', { name: /Add Rule/i }).first()).toBeVisible();
  });

  test('Owner sees Delete button on revenue rules', async ({ page }) => {
    await page.getByRole('tab', { name: /Revenue/i }).click();
    const deleteBtn = page.locator('.text-destructive').filter({ hasText: /^Delete$/ });
    await expect(deleteBtn.first()).toBeVisible();
  });

  test('Owner sees Create Company button', async ({ page }) => {
    await page.goto('/en/companies');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Create Company/i })).toBeVisible();
  });
});

test.describe('Role permissions — Editor UI', () => {
  test('Editor sees "Editor" role badge', async ({ browser }) => {
    test.skip(!companyId, 'Seed company not found');
    const context = await browser.newContext({ storageState: 'auth/editor-storage.json' });
    const page = await context.newPage();
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Editor', { exact: true })).toBeVisible();
    await context.close();
  });

  test('Editor sees Add Partner button (can create)', async ({ browser }) => {
    test.skip(!companyId, 'Seed company not found');
    const context = await browser.newContext({ storageState: 'auth/editor-storage.json' });
    const page = await context.newPage();
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Add Partner/i })).toBeVisible();
    await context.close();
  });

  test('Editor sees Edit button but NOT Delete on partners', async ({ browser }) => {
    test.skip(!companyId, 'Seed company not found');
    const context = await browser.newContext({ storageState: 'auth/editor-storage.json' });
    const page = await context.newPage();
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /^Edit$/ }).first()).toBeVisible();
    const deleteButtons = page.locator('.text-destructive').filter({ hasText: /^Delete$/ });
    await expect(deleteButtons).toHaveCount(0);
    await context.close();
  });

  test('Editor does NOT see Generate Agreement button', async ({ browser }) => {
    test.skip(!companyId, 'Seed company not found');
    const context = await browser.newContext({ storageState: 'auth/editor-storage.json' });
    const page = await context.newPage();
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Partnership Agreement/i }).click();
    const generateBtn = page.getByRole('button', { name: /Generate Agreement/i });
    await expect(generateBtn).toHaveCount(0);
    await context.close();
  });

  test('Editor does NOT see Audit tab', async ({ browser }) => {
    test.skip(!companyId, 'Seed company not found');
    const context = await browser.newContext({ storageState: 'auth/editor-storage.json' });
    const page = await context.newPage();
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    const auditTab = page.getByRole('tab', { name: /Audit/i });
    await expect(auditTab).toHaveCount(0);
    await context.close();
  });

  test('Editor sees Add Rule but NOT Delete on revenue rules', async ({ browser }) => {
    test.skip(!companyId, 'Seed company not found');
    const context = await browser.newContext({ storageState: 'auth/editor-storage.json' });
    const page = await context.newPage();
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Revenue/i }).click();
    await expect(page.getByRole('button', { name: /Add Rule/i }).first()).toBeVisible();
    const deleteButtons = page.locator('.text-destructive').filter({ hasText: /^Delete$/ });
    await expect(deleteButtons).toHaveCount(0);
    await context.close();
  });
});

test.describe('Role permissions — API level', () => {
  test('Editor cannot delete partner via API', async () => {
    test.skip(!companyId, 'Seed company not found');
    const api = new ApiClient();
    await api.login(EDITOR.email, EDITOR.password);
    const partners = await api.getPartners(companyId);
    if (partners.length > 0) {
      try {
        await api.deletePartner(companyId, partners[0].id);
        test.fail(true, 'Editor should not be able to delete partner');
      } catch (err: any) {
        expect(err.message).toMatch(/40[13]/);
      }
    }
  });

  test('Editor cannot delete revenue rule via API', async () => {
    test.skip(!companyId, 'Seed company not found');
    const api = new ApiClient();
    await api.login(EDITOR.email, EDITOR.password);
    const rules = await api.getRevenueRules(companyId);
    if (rules.length > 0) {
      try {
        await api.deleteRevenueRule(companyId, rules[0].id);
        test.fail(true, 'Editor should not be able to delete rule');
      } catch (err: any) {
        expect(err.message).toMatch(/40[13]/);
      }
    }
  });

  test('Editor cannot generate agreement via API', async () => {
    test.skip(!companyId, 'Seed company not found');
    const api = new ApiClient();
    await api.login(EDITOR.email, EDITOR.password);
    try {
      await api.generateAgreement(companyId);
      test.fail(true, 'Editor should not be able to generate agreement');
    } catch (err: any) {
      expect(err.message).toMatch(/40[13]/);
    }
  });

  test('Editor cannot access audit log via API', async () => {
    test.skip(!companyId, 'Seed company not found');
    const api = new ApiClient();
    await api.login(EDITOR.email, EDITOR.password);
    try {
      await api.getAuditLog(companyId);
      test.fail(true, 'Editor should not be able to access audit log');
    } catch (err: any) {
      expect(err.message).toMatch(/40[13]/);
    }
  });
});
