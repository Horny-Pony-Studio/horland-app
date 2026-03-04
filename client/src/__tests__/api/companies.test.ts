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

import { companiesApi } from '@/lib/api/companies';

describe('companiesApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list calls GET /api/companies', async () => {
    mockGet.mockResolvedValue([]);
    await companiesApi.list();
    expect(mockGet).toHaveBeenCalledWith('/api/companies');
  });

  it('get calls GET /api/companies/:id', async () => {
    mockGet.mockResolvedValue({ id: 'c1', name: 'Test' });
    await companiesApi.get('c1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1');
  });

  it('create calls POST /api/companies', async () => {
    const data = { name: 'New Corp', type: 'Company' };
    mockPost.mockResolvedValue({ id: 'c1', ...data });
    await companiesApi.create(data);
    expect(mockPost).toHaveBeenCalledWith('/api/companies', data);
  });

  it('update calls PUT /api/companies/:id', async () => {
    const data = { name: 'Updated Corp' };
    mockPut.mockResolvedValue({ id: 'c1', ...data });
    await companiesApi.update('c1', data);
    expect(mockPut).toHaveBeenCalledWith('/api/companies/c1', data);
  });

  it('delete calls DELETE /api/companies/:id', async () => {
    mockDelete.mockResolvedValue(undefined);
    await companiesApi.delete('c1');
    expect(mockDelete).toHaveBeenCalledWith('/api/companies/c1');
  });
});
