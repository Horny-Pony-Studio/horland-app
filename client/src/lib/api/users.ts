import { api } from './client';
import type { UserSearchResult } from '@/types';

export const usersApi = {
  search: (q: string) => api.get<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`),
};
