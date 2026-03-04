import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agreementsApi } from '@/lib/api/agreements';

export function useAgreements(companyId: string) {
  return useQuery({
    queryKey: ['agreements', companyId],
    queryFn: () => agreementsApi.list(companyId),
    enabled: !!companyId,
  });
}

export function useAgreement(companyId: string, agreementId: string) {
  return useQuery({
    queryKey: ['agreements', companyId, agreementId],
    queryFn: () => agreementsApi.get(companyId, agreementId),
    enabled: !!companyId && !!agreementId,
  });
}

export function useGenerateAgreement(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => agreementsApi.generate(companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agreements', companyId] }),
  });
}

export function useDownloadAgreementPdf(companyId: string) {
  return useMutation({
    mutationFn: (agreementId: string) => agreementsApi.downloadPdf(companyId, agreementId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agreement.pdf';
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useSignLinks(companyId: string, agreementId: string) {
  return useQuery({
    queryKey: ['sign-links', companyId, agreementId],
    queryFn: () => agreementsApi.getSignLinks(companyId, agreementId),
    enabled: !!companyId && !!agreementId,
  });
}

export function useSignAgreement(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agreementId, signature }: { agreementId: string; signature: Blob }) =>
      agreementsApi.sign(companyId, agreementId, signature),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agreements', companyId] }),
  });
}
