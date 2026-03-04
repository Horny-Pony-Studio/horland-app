import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete },
}));

import { membersApi } from '@/lib/api/members';

describe('membersApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list calls GET', async () => {
    mockGet.mockResolvedValue([]);
    await membersApi.list('c1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/members');
  });

  it('add calls POST with data', async () => {
    const data = { email: 'editor@test.com', role: 'Editor' };
    mockPost.mockResolvedValue({ id: 'm1', ...data });
    await membersApi.add('c1', data);
    expect(mockPost).toHaveBeenCalledWith('/api/companies/c1/members', data);
  });

  it('toggleEditor calls PATCH', async () => {
    mockPatch.mockResolvedValue({ id: 'm1' });
    await membersApi.toggleEditor('c1', 'm1');
    expect(mockPatch).toHaveBeenCalledWith('/api/companies/c1/members/m1/toggle-editor');
  });

  it('remove calls DELETE', async () => {
    mockDelete.mockResolvedValue(undefined);
    await membersApi.remove('c1', 'm1');
    expect(mockDelete).toHaveBeenCalledWith('/api/companies/c1/members/m1');
  });
});
