import { api } from './client';

export interface AuthResponse {
  id: string;
  email: string;
  fullName: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterRequest) => api.post<AuthResponse>('/api/auth/register', data),
  login: (data: LoginRequest) => api.post<AuthResponse>('/api/auth/login', data),
  refresh: () => api.post<void>('/api/auth/refresh'),
  logout: () => api.post<void>('/api/auth/logout'),
  me: () => api.get<AuthResponse>('/api/auth/me'),
};
