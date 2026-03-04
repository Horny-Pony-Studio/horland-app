import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock partner hooks
const mockPartners = [
  {
    id: '1',
    fullName: 'John Doe',
    companyShare: 40,
    photoUrl: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '2',
    fullName: 'Jane Smith',
    companyShare: 30,
    photoUrl: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

vi.mock('@/lib/hooks/use-partners', () => ({
  usePartners: () => ({ data: mockPartners, isLoading: false }),
  useCreatePartner: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdatePartner: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeletePartner: () => ({ mutateAsync: vi.fn() }),
  useUploadPartnerPhoto: () => ({ mutateAsync: vi.fn() }),
}));

import { PartnersTab } from '@/components/features/partners-tab';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('PartnersTab', () => {
  it('renders partner names', () => {
    renderWithProviders(<PartnersTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders partner shares', () => {
    renderWithProviders(<PartnersTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('shows add button for Owner role', () => {
    renderWithProviders(<PartnersTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('partners.add')).toBeInTheDocument();
  });

  it('shows total shares summary', () => {
    renderWithProviders(<PartnersTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText(/70\.0%/)).toBeInTheDocument();
  });
});
