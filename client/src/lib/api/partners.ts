import { api } from './client';
import type { PartnerResponse, CreatePartnerRequest, UpdatePartnerRequest } from '@/types';

export const partnersApi = {
  list: (companyId: string) => api.get<PartnerResponse[]>(`/api/companies/${companyId}/partners`),
  get: (companyId: string, partnerId: string) => api.get<PartnerResponse>(`/api/companies/${companyId}/partners/${partnerId}`),
  create: (companyId: string, data: CreatePartnerRequest) => api.post<PartnerResponse>(`/api/companies/${companyId}/partners`, data),
  update: (companyId: string, partnerId: string, data: UpdatePartnerRequest) => api.put<PartnerResponse>(`/api/companies/${companyId}/partners/${partnerId}`, data),
  delete: (companyId: string, partnerId: string) => api.delete(`/api/companies/${companyId}/partners/${partnerId}`),
  uploadPhoto: (companyId: string, partnerId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ photoUrl: string }>(`/api/companies/${companyId}/partners/${partnerId}/photo`, formData);
  },
};
