import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { revenueApi } from '@/lib/api/revenue';
import type { CreateRevenueRuleRequest, UpdateRevenueRuleRequest } from '@/types';

export function useRevenueRules(companyId: string) {
  return useQuery({
    queryKey: ['revenue-rules', companyId],
    queryFn: () => revenueApi.list(companyId),
    enabled: !!companyId,
  });
}

export function useCreateRevenueRule(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRevenueRuleRequest) => revenueApi.create(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenue-rules', companyId] }),
  });
}

export function useUpdateRevenueRule(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: UpdateRevenueRuleRequest }) =>
      revenueApi.update(companyId, ruleId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenue-rules', companyId] }),
  });
}

export function useDeleteRevenueRule(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => revenueApi.delete(companyId, ruleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenue-rules', companyId] }),
  });
}
