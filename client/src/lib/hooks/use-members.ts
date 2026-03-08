import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/lib/api/members';
import type { AddMemberRequest } from '@/types';

export function useMembers(companyId: string) {
  return useQuery({
    queryKey: ['members', companyId],
    queryFn: () => membersApi.list(companyId),
    enabled: !!companyId,
  });
}

export function useAddMember(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddMemberRequest) => membersApi.add(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', companyId] });
      queryClient.invalidateQueries({ queryKey: ['partners', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId] });
    },
  });
}

export function useToggleEditor(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => membersApi.toggleEditor(companyId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', companyId] });
    },
  });
}

export function useRemoveMember(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => membersApi.remove(companyId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', companyId] });
      queryClient.invalidateQueries({ queryKey: ['partners', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId] });
    },
  });
}
