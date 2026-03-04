import { api } from './client';
import type { RevenueRuleResponse, CreateRevenueRuleRequest, UpdateRevenueRuleRequest } from '@/types';

export const revenueApi = {
  list: (companyId: string) => api.get<RevenueRuleResponse[]>(`/api/companies/${companyId}/revenue-rules`),
  create: (companyId: string, data: CreateRevenueRuleRequest) => api.post<RevenueRuleResponse>(`/api/companies/${companyId}/revenue-rules`, data),
  update: (companyId: string, ruleId: string, data: UpdateRevenueRuleRequest) => api.put<RevenueRuleResponse>(`/api/companies/${companyId}/revenue-rules/${ruleId}`, data),
  delete: (companyId: string, ruleId: string) => api.delete(`/api/companies/${companyId}/revenue-rules/${ruleId}`),
};
