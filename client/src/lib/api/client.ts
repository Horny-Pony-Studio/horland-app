const API_BASE = '';

interface ApiError {
  error: string;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const fetchOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    let response = await fetch(url, fetchOptions);

    // Auto-refresh on 401 (skip for auth endpoints to avoid loops)
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        response = await fetch(url, fetchOptions);
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ error: 'Network error' }));
      throw new ApiClientError(response.status, error.error, error.errors);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete(path: string): Promise<void> {
    return this.request(path, { method: 'DELETE' });
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new ApiClientError(response.status, error.error, error.errors);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  async downloadBlob(path: string): Promise<Blob> {
    const url = `${this.baseUrl}${path}`;
    let response = await fetch(url, {
      credentials: 'include',
    });

    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        response = await fetch(url, {
          credentials: 'include',
        });
      }
    }

    if (!response.ok) {
      throw new ApiClientError(response.status, 'Download failed');
    }

    return response.blob();
  }
}

export class ApiClientError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = 'ApiClientError';
  }
}

export const api = new ApiClient(API_BASE);
