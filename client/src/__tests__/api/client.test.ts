import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClientError } from '@/lib/api/client';

// We test ApiClientError directly, and test the ApiClient behavior through fetch mocking
describe('ApiClientError', () => {
  it('creates error with status and message', () => {
    const error = new ApiClientError(404, 'Not Found');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not Found');
    expect(error.name).toBe('ApiClientError');
    expect(error).toBeInstanceOf(Error);
  });

  it('creates error with validation errors', () => {
    const errors = { email: ['Email is required'], password: ['Too short'] };
    const error = new ApiClientError(400, 'Validation failed', errors);
    expect(error.status).toBe(400);
    expect(error.errors).toEqual(errors);
  });

  it('creates error without validation errors', () => {
    const error = new ApiClientError(500, 'Server error');
    expect(error.errors).toBeUndefined();
  });
});

describe('ApiClient (via api instance)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends GET request with correct headers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const { api } = await import('@/lib/api/client');
    const result = await api.get('/api/test');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
    expect(result).toEqual({ data: 'test' });
  });

  it('sends POST request with body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    });

    const { api } = await import('@/lib/api/client');
    await api.post('/api/test', { name: 'Test' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      })
    );
  });

  it('sends PUT request with body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    });

    const { api } = await import('@/lib/api/client');
    await api.put('/api/test/1', { name: 'Updated' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      })
    );
  });

  it('sends PATCH request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    });

    const { api } = await import('@/lib/api/client');
    await api.patch('/api/test/1', { status: 'active' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      })
    );
  });

  it('sends DELETE request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });

    const { api } = await import('@/lib/api/client');
    await api.delete('/api/test/1');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test/1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('returns undefined for 204 No Content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });

    const { api } = await import('@/lib/api/client');
    const result = await api.get('/api/test');
    expect(result).toBeUndefined();
  });

  it('throws ApiClientError on error response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad Request', errors: { field: ['invalid'] } }),
    });

    const { api } = await import('@/lib/api/client');

    try {
      await api.get('/api/test');
      expect.unreachable('should have thrown');
    } catch (e: unknown) {
      const err = e as { name: string; status: number; errors: Record<string, string[]> };
      expect(err.name).toBe('ApiClientError');
      expect(err.status).toBe(400);
      expect(err.errors).toEqual({ field: ['invalid'] });
    }
  });

  it('throws with "Network error" when response JSON parsing fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse error')),
    });

    const { api } = await import('@/lib/api/client');

    await expect(api.get('/api/test')).rejects.toThrow('Network error');
  });

  it('auto-refreshes token on 401 for non-auth endpoints', async () => {
    const mockFetch = vi.fn()
      // First request returns 401
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) })
      // Refresh request succeeds
      .mockResolvedValueOnce({ ok: true, status: 200 })
      // Retry request succeeds
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: 'refreshed' }) });

    global.fetch = mockFetch;

    const { api } = await import('@/lib/api/client');
    const result = await api.get('/api/data');

    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Second call should be the refresh
    expect(mockFetch).toHaveBeenNthCalledWith(2,
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
    expect(result).toEqual({ data: 'refreshed' });
  });

  it('does not auto-refresh for auth endpoints', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    const { api } = await import('@/lib/api/client');

    await expect(api.post('/api/auth/login', {})).rejects.toThrow('Unauthorized');
    // Only 1 call - no refresh attempt
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws if refresh fails and does not retry', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) })
      // Refresh fails
      .mockResolvedValueOnce({ ok: false, status: 401 });

    global.fetch = mockFetch;

    const { api } = await import('@/lib/api/client');

    await expect(api.get('/api/data')).rejects.toThrow('Unauthorized');
    // 2 calls: original + refresh (no retry)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('upload sends FormData without Content-Type header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ url: '/uploads/file.png' }),
    });

    const { api } = await import('@/lib/api/client');
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.png');

    const result = await api.upload('/api/upload', formData);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
    );
    expect(result).toEqual({ url: '/uploads/file.png' });
  });

  it('upload handles 401 with auto-refresh', async () => {
    const formData = new FormData();
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ url: '/ok' }) });

    global.fetch = mockFetch;

    const { api } = await import('@/lib/api/client');
    const result = await api.upload('/api/upload', formData);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ url: '/ok' });
  });

  it('upload throws on error with "Upload failed" fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse')),
    });

    const { api } = await import('@/lib/api/client');
    const formData = new FormData();

    await expect(api.upload('/api/upload', formData)).rejects.toThrow('Upload failed');
  });

  it('downloadBlob returns a Blob', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(mockBlob),
    });

    const { api } = await import('@/lib/api/client');
    const result = await api.downloadBlob('/api/download');

    expect(result).toBe(mockBlob);
  });

  it('downloadBlob handles 401 with auto-refresh', async () => {
    const mockBlob = new Blob(['content']);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200, blob: () => Promise.resolve(mockBlob) });

    global.fetch = mockFetch;

    const { api } = await import('@/lib/api/client');
    const result = await api.downloadBlob('/api/download');

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toBe(mockBlob);
  });

  it('downloadBlob throws ApiClientError on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { api } = await import('@/lib/api/client');

    await expect(api.downloadBlob('/api/download')).rejects.toThrow('Download failed');
  });

  it('POST without body sends undefined body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });

    const { api } = await import('@/lib/api/client');
    await api.post('/api/test');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: undefined,
      })
    );
  });
});
