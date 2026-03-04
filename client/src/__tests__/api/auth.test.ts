import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: mockGet, post: mockPost },
}));

import { authApi } from '@/lib/api/auth';

describe('authApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('register calls POST /api/auth/register', async () => {
    const data = { email: 'test@example.com', password: 'Pass123', fullName: 'Test' };
    mockPost.mockResolvedValue({ id: '1', email: data.email, fullName: data.fullName });

    const result = await authApi.register(data);

    expect(mockPost).toHaveBeenCalledWith('/api/auth/register', data);
    expect(result.email).toBe(data.email);
  });

  it('login calls POST /api/auth/login', async () => {
    const data = { email: 'test@example.com', password: 'Pass123' };
    mockPost.mockResolvedValue({ id: '1', email: data.email, fullName: 'Test' });

    await authApi.login(data);
    expect(mockPost).toHaveBeenCalledWith('/api/auth/login', data);
  });

  it('refresh calls POST /api/auth/refresh', async () => {
    mockPost.mockResolvedValue(undefined);
    await authApi.refresh();
    expect(mockPost).toHaveBeenCalledWith('/api/auth/refresh');
  });

  it('logout calls POST /api/auth/logout', async () => {
    mockPost.mockResolvedValue(undefined);
    await authApi.logout();
    expect(mockPost).toHaveBeenCalledWith('/api/auth/logout');
  });

  it('me calls GET /api/auth/me', async () => {
    mockGet.mockResolvedValue({ id: '1', email: 'test@test.com', fullName: 'Test' });
    const result = await authApi.me();
    expect(mockGet).toHaveBeenCalledWith('/api/auth/me');
    expect(result.id).toBe('1');
  });
});
