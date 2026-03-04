import type { FullConfig } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const MAX_RETRIES = 10;
const RETRY_DELAY = 3000;

async function waitForService(url: string, label: string): Promise<void> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok || res.status < 500) {
        console.log(`  ✓ ${label} is up (${url})`);
        return;
      }
    } catch {
      // not ready yet
    }
    console.log(`  … waiting for ${label} (attempt ${i + 1}/${MAX_RETRIES})`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY));
  }
  throw new Error(`${label} at ${url} did not become available after ${MAX_RETRIES} attempts`);
}

export default async function globalSetup(_config: FullConfig) {
  console.log('\n🔍 Checking Docker stack health…');
  await waitForService(BASE_URL, 'Frontend');
  await waitForService(`${BASE_URL}/api/auth/me`, 'API (via proxy)');
  console.log('✓ All services are up\n');
}
