import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c1' }),
}));

let mockCompany: Record<string, unknown> | undefined = {
  id: 'c1',
  name: 'Test Corp',
  userRole: 'Owner',
};

vi.mock('@/lib/hooks/use-companies', () => ({
  useCompany: () => ({ data: mockCompany }),
}));

vi.mock('@/lib/hooks/use-members', () => ({
  useMembers: () => ({
    data: [
      { id: 'm1', userId: 'u1', email: 'owner@test.com', fullName: 'Owner', role: 'Owner', createdAt: '2024-01-01' },
    ],
    isLoading: false,
  }),
  useAddMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleEditor: () => ({ mutateAsync: vi.fn() }),
  useRemoveMember: () => ({ mutateAsync: vi.fn() }),
}));

import SettingsPage from '@/app/[locale]/(dashboard)/companies/[id]/settings/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mockCompany = { id: 'c1', name: 'Test Corp', userRole: 'Owner' };
  });

  it('renders MembersTab for Owner', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('returns null for Editor', () => {
    mockCompany = { ...mockCompany!, userRole: 'Editor' };
    const { container } = renderWithProviders(<SettingsPage />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when no company', () => {
    mockCompany = undefined;
    const { container } = renderWithProviders(<SettingsPage />);
    expect(container.innerHTML).toBe('');
  });
});
