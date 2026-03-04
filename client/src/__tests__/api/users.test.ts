import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: mockGet },
}));

import { usersApi } from '@/lib/api/users';

describe('usersApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('search calls GET with encoded query', async () => {
    mockGet.mockResolvedValue([]);
    await usersApi.search('test user');
    expect(mockGet).toHaveBeenCalledWith('/api/users/search?q=test%20user');
  });

  it('search encodes special characters', async () => {
    mockGet.mockResolvedValue([]);
    await usersApi.search('user@test.com');
    expect(mockGet).toHaveBeenCalledWith('/api/users/search?q=user%40test.com');
  });

  it('search with empty string', async () => {
    mockGet.mockResolvedValue([]);
    await usersApi.search('');
    expect(mockGet).toHaveBeenCalledWith('/api/users/search?q=');
  });
});
