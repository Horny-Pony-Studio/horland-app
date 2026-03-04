/* ── Seed credentials ─────────────────────────────── */
export const OWNER = {
  email: 'demo@horand.com',
  password: 'Demo1234!',
  fullName: 'Demo User',
} as const;

export const EDITOR = {
  email: 'editor@horand.com',
  password: 'Editor1234!',
  fullName: 'Editor User',
} as const;

/* ── Seed company ────────────────────────────────── */
export const SEED_COMPANY = {
  name: 'HORAND Tech',
  type: 'Company',
} as const;

/* ── Seed partners (Ukrainian names in DB) ───────── */
export const SEED_PARTNERS = [
  { fullName: 'Іван Петренко', share: 40 },
  { fullName: 'Олена Коваленко', share: 35 },
  { fullName: 'Андрій Шевченко', share: 25 },
] as const;

/* ── Seed revenue rules ──────────────────────────── */
export const SEED_REVENUE_RULES = [
  { type: 'Project', name: 'Проєкт Alpha' },
  { type: 'ClientIncome', name: 'Клієнти Q1' },
  { type: 'NetProfit', name: 'Чистий прибуток' },
] as const;

/* ── Test constants for creating new entities ────── */
export const TEST_COMPANY = {
  name: `E2E-Test-Co-${Date.now()}`,
  type: 'Company',
} as const;

export const TEST_PARTNER = {
  fullName: 'Test Partner',
  companyShare: 10,
} as const;

export const TEST_REVENUE_RULE = {
  name: 'E2E Revenue Rule',
} as const;

export const TEST_USER = {
  email: `e2e-${Date.now()}@test.com`,
  password: 'TestPass1234!',
  fullName: 'E2E Test User',
} as const;

/* ── URLs ─────────────────────────────────────────── */
// API is proxied through the frontend via Next.js rewrites (/api/* → backend)
export const API_URL = process.env.API_URL ?? 'http://localhost:3000';
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
