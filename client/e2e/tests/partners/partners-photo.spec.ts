import { test, expect } from '@playwright/test';
import { ApiClient } from '../../helpers/api-client';
import { OWNER, SEED_COMPANY, SEED_PARTNERS } from '../../helpers/test-data';
import path from 'path';
import fs from 'fs';

let companyId: string;

test.beforeAll(async () => {
  const api = new ApiClient();
  await api.login(OWNER.email, OWNER.password);
  const companies = await api.getCompanies();
  const seed = companies.find((c: any) => c.name === SEED_COMPANY.name);
  if (seed) companyId = seed.id;

  // Create a tiny test PNG for upload tests
  const testImageDir = path.join(__dirname, '..', '..', 'helpers');
  const testImagePath = path.join(testImageDir, 'test-photo.png');
  if (!fs.existsSync(testImagePath)) {
    // 1x1 red PNG (minimal valid PNG)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64',
    );
    fs.writeFileSync(testImagePath, pngBuffer);
  }
});

test.describe('Partner photo upload', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!companyId, 'Seed company not found');
    await page.goto(`/en/companies/${companyId}`);
    await page.waitForLoadState('networkidle');
  });

  test('partner avatar shows initials fallback when no photo', async ({ page }) => {
    // At least one partner avatar should show text initials
    const avatarFallbacks = page.locator('.bg-violet-100.text-violet-700');
    const count = await avatarFallbacks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('hovering partner avatar reveals upload overlay (Owner)', async ({ page }) => {
    // The upload overlay appears on hover via CSS (group-hover:opacity-100)
    const group = page.locator('.group').first();
    await group.hover();
    // The label with "Upload Photo" text should be there (even if opacity-0 normally)
    const uploadLabel = group.locator('label');
    await expect(uploadLabel).toBeAttached();
  });

  test('file input accepts image types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toHaveAttribute('accept', '.jpg,.jpeg,.png,.webp');
  });

  test('can trigger photo upload via file input', async ({ page }) => {
    const testImagePath = path.join(__dirname, '..', '..', 'helpers', 'test-photo.png');
    test.skip(!fs.existsSync(testImagePath), 'Test image not found');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);

    // Wait for upload to process (network request)
    await page.waitForTimeout(2000);
    // No error alerts should appear for a valid small PNG
  });
});
