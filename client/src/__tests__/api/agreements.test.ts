import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost, mockUpload, mockDownloadBlob } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockUpload: vi.fn(),
  mockDownloadBlob: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: mockGet, post: mockPost, upload: mockUpload, downloadBlob: mockDownloadBlob },
}));

import { agreementsApi, publicSignApi } from '@/lib/api/agreements';

describe('agreementsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list calls GET with companyId', async () => {
    mockGet.mockResolvedValue([]);
    await agreementsApi.list('c1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/agreements');
  });

  it('get calls GET with companyId and agreementId', async () => {
    mockGet.mockResolvedValue({ id: 'a1' });
    await agreementsApi.get('c1', 'a1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/agreements/a1');
  });

  it('generate calls POST', async () => {
    mockPost.mockResolvedValue({ id: 'a1', version: 1 });
    await agreementsApi.generate('c1');
    expect(mockPost).toHaveBeenCalledWith('/api/companies/c1/agreements');
  });

  it('downloadPdf calls downloadBlob', async () => {
    mockDownloadBlob.mockResolvedValue(new Blob());
    await agreementsApi.downloadPdf('c1', 'a1');
    expect(mockDownloadBlob).toHaveBeenCalledWith('/api/companies/c1/agreements/a1/pdf');
  });

  it('getSignLinks calls GET', async () => {
    mockGet.mockResolvedValue([]);
    await agreementsApi.getSignLinks('c1', 'a1');
    expect(mockGet).toHaveBeenCalledWith('/api/companies/c1/agreements/a1/sign-links');
  });

  it('sign uploads FormData with signature', async () => {
    const blob = new Blob(['sig'], { type: 'image/png' });
    mockUpload.mockResolvedValue({ id: 'a1' });

    await agreementsApi.sign('c1', 'a1', blob);

    expect(mockUpload).toHaveBeenCalledWith(
      '/api/companies/c1/agreements/a1/sign',
      expect.any(FormData)
    );
  });
});

describe('publicSignApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getInfo calls GET with token', async () => {
    mockGet.mockResolvedValue({ companyName: 'Test', partnerName: 'Alice' });
    await publicSignApi.getInfo('token123');
    expect(mockGet).toHaveBeenCalledWith('/api/sign/token123');
  });

  it('sign uploads FormData with signature', async () => {
    const blob = new Blob(['sig']);
    mockUpload.mockResolvedValue({ message: 'ok' });

    await publicSignApi.sign('token123', blob);

    expect(mockUpload).toHaveBeenCalledWith(
      '/api/sign/token123',
      expect.any(FormData)
    );
  });
});
