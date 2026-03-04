import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => usersApi.search(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
