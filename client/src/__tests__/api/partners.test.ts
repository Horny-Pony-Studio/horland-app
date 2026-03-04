import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost, mockPut, mockDelete, mockUpload } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
  mockUpload: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: mockGet, post: mockPost, put: mockPut, delete: mockDelete, upload: mockUpload },
}));

import { partnersApi } from '@/lib/api/partners';

describe('partnersApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list calls correct endpoint', async () => {
    mockGet.mockResolvedValue([]);
    await partnersApi.list('c1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/partners');
  });

  it('get calls correct endpoint', async () => {
    mockGet.mockResolvedValue({ id: 'p1' });
    await partnersApi.get('c1', 'p1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/partners/p1');
  });

  it('create calls POST with data', async () => {
    const data = { userId: 'u1', companyShare: 50 };
    mockPost.mockResolvedValue({ id: 'p1', ...data });
    await partnersApi.create('c1', data);
    expect(mockPost).toHaveBeenCalledWith('/api/companies/c1/partners', data);
  });

  it('update calls PUT with data', async () => {
    const data = { companyShare: 60 };
    mockPut.mockResolvedValue({ id: 'p1' });
    await partnersApi.update('c1', 'p1', data);
    expect(mockPut).toHaveBeenCalledWith('/api/companies/c1/partners/p1', data);
  });

  it('delete calls correct endpoint', async () => {
    mockDelete.mockResolvedValue(undefined);
    await partnersApi.delete('c1', 'p1');
    expect(mockDelete).toHaveBeenCalledWith('/api/companies/c1/partners/p1');
  });

  it('uploadPhoto creates FormData and calls upload', async () => {
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    mockUpload.mockResolvedValue({ photoUrl: '/uploads/photo.jpg' });

    await partnersApi.uploadPhoto('c1', 'p1', file);

    expect(mockUpload).toHaveBeenCalledWith(
      '/api/companies/c1/partners/p1/photo',
      expect.any(FormData)
    );
  });
});
