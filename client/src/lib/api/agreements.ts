import { api } from './client';
import type { AgreementResponse, SignLinkResponse, SignInfoResponse } from '@/types';

export const agreementsApi = {
  list: (companyId: string) => api.get<AgreementResponse[]>(`/api/companies/${companyId}/agreements`),
  get: (companyId: string, agreementId: string) => api.get<AgreementResponse>(`/api/companies/${companyId}/agreements/${agreementId}`),
  generate: (companyId: string) => api.post<AgreementResponse>(`/api/companies/${companyId}/agreements`),
  downloadPdf: (companyId: string, agreementId: string) => api.downloadBlob(`/api/companies/${companyId}/agreements/${agreementId}/pdf`),
  getSignLinks: (companyId: string, agreementId: string) => api.get<SignLinkResponse[]>(`/api/companies/${companyId}/agreements/${agreementId}/sign-links`),
  sign: (companyId: string, agreementId: string, signatureFile: Blob) => {
    const formData = new FormData();
    formData.append('signature', signatureFile, 'signature.png');
    return api.upload<AgreementResponse>(`/api/companies/${companyId}/agreements/${agreementId}/sign`, formData);
  },
};

export const publicSignApi = {
  getInfo: (token: string) => api.get<SignInfoResponse>(`/api/sign/${token}`),
  sign: (token: string, signatureFile: Blob) => {
    const formData = new FormData();
    formData.append('signature', signatureFile, 'signature.png');
    return api.upload<{ message: string }>(`/api/sign/${token}`, formData);
  },
};
