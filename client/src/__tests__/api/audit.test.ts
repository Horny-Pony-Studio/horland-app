import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: mockGet },
}));

import { auditApi } from '@/lib/api/audit';

describe('auditApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list calls GET with default pagination', async () => {
    mockGet.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 });
    await auditApi.list('c1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/audit-log?page=1&pageSize=20');
  });

  it('list calls GET with custom pagination', async () => {
    mockGet.mockResolvedValue({ items: [], totalCount: 0, page: 2, pageSize: 10 });
    await auditApi.list('c1', 2, 10);
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/audit-log?page=2&pageSize=10');
  });
});
