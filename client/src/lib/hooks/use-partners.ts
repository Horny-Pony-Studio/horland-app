import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnersApi } from '@/lib/api/partners';
import type { CreatePartnerRequest, UpdatePartnerRequest } from '@/types';

export function usePartners(companyId: string) {
  return useQuery({
    queryKey: ['partners', companyId],
    queryFn: () => partnersApi.list(companyId),
    enabled: !!companyId,
  });
}

export function useCreatePartner(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePartnerRequest) => partnersApi.create(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', companyId] });
      queryClient.invalidateQueries({ queryKey: ['members', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId] });
    },
  });
}

export function useUpdatePartner(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: string; data: UpdatePartnerRequest }) =>
      partnersApi.update(companyId, partnerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId] });
    },
  });
}

export function useDeletePartner(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: string) => partnersApi.delete(companyId, partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', companyId] });
      queryClient.invalidateQueries({ queryKey: ['members', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId] });
    },
  });
}

export function useUploadPartnerPhoto(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ partnerId, file }: { partnerId: string; file: File }) =>
      partnersApi.uploadPhoto(companyId, partnerId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners', companyId] }),
  });
}
