import { api } from './client';
import type { CompanyResponse, CompanyDetailResponse, CreateCompanyRequest, UpdateCompanyRequest } from '@/types';

export const companiesApi = {
  list: () => api.get<CompanyResponse[]>('/api/companies'),
  get: (id: string) => api.get<CompanyDetailResponse>(`/api/companies/${id}`),
  create: (data: CreateCompanyRequest) => api.post<CompanyResponse>('/api/companies', data),
  update: (id: string, data: UpdateCompanyRequest) => api.put<CompanyResponse>(`/api/companies/${id}`, data),
  delete: (id: string) => api.delete(`/api/companies/${id}`),
};
