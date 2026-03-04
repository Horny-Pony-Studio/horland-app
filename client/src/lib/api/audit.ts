import { api } from './client';
import type { AuditLogPageResponse } from '@/types';

export const auditApi = {
  list: (companyId: string, page = 1, pageSize = 20) =>
    api.get<AuditLogPageResponse>(`/api/companies/${companyId}/audit-log?page=${page}&pageSize=${pageSize}`),
};
