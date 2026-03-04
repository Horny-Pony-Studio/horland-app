import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: mockGet, post: mockPost, put: mockPut, delete: mockDelete },
}));

import { revenueApi } from '@/lib/api/revenue';

describe('revenueApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list calls GET with companyId', async () => {
    mockGet.mockResolvedValue([]);
    await revenueApi.list('c1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/revenue-rules');
  });

  it('create calls POST with data', async () => {
    const data = {
      type: 'Project',
      name: 'Rule A',
      shares: [{ partnerId: 'p1', percentage: 100 }],
    };
    mockPost.mockResolvedValue({ id: 'r1', ...data });
    await revenueApi.create('c1', data);
    expect(mockPost).toHaveBeenCalledWith('/api/companies/c1/revenue-rules', data);
  });

  it('update calls PUT with ruleId and data', async () => {
    const data = { name: 'Updated', shares: [{ partnerId: 'p1', percentage: 100 }] };
    mockPut.mockResolvedValue({ id: 'r1' });
    await revenueApi.update('c1', 'r1', data);
    expect(mockPut).toHaveBeenCalledWith('/api/companies/c1/revenue-rules/r1', data);
  });

  it('delete calls DELETE with ruleId', async () => {
    mockDelete.mockResolvedValue(undefined);
    await revenueApi.delete('c1', 'r1');
    expect(mockDelete).toHaveBeenCalledWith('/api/companies/c1/revenue-rules/r1');
  });
});
