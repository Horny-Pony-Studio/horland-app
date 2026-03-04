import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  globalSetup: './global-setup.ts',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    timezoneId: 'Europe/Kyiv',
  },

  projects: [
    {
      name: 'auth-setup-owner',
      testMatch: 'auth.setup.ts',
    },
    {
      name: 'auth-setup-editor',
      testMatch: 'auth-editor.setup.ts',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'auth/owner-storage.json',
      },
      dependencies: ['auth-setup-owner', 'auth-setup-editor'],
      testIgnore: ['**/auth.setup.ts', '**/auth-editor.setup.ts'],
    },
  ],
});
