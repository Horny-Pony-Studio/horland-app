import { api } from './client';
import type { MemberResponse, AddMemberRequest } from '@/types';

export const membersApi = {
  list: (companyId: string) => api.get<MemberResponse[]>(`/api/companies/${companyId}/members`),
  add: (companyId: string, data: AddMemberRequest) => api.post<MemberResponse>(`/api/companies/${companyId}/members`, data),
  toggleEditor: (companyId: string, memberId: string) => api.patch<MemberResponse>(`/api/companies/${companyId}/members/${memberId}/toggle-editor`),
  remove: (companyId: string, memberId: string) => api.delete(`/api/companies/${companyId}/members/${memberId}`),
};
