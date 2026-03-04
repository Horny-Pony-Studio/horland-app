import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockPartners = [
  { id: 'p1', fullName: 'Alice', companyShare: 60, photoUrl: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'p2', fullName: 'Bob', companyShare: 40, photoUrl: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

const mockRules = [
  {
    id: 'r1',
    type: 'Project',
    name: 'Project Rule A',
    shares: [
      { id: 's1', partnerId: 'p1', partnerName: 'Alice', percentage: 60 },
      { id: 's2', partnerId: 'p2', partnerName: 'Bob', percentage: 40 },
    ],
    createdAt: '2024-01-01',
  },
  {
    id: 'r2',
    type: 'ClientIncome',
    name: 'Client Rule B',
    shares: [
      { id: 's3', partnerId: 'p1', partnerName: 'Alice', percentage: 50 },
      { id: 's4', partnerId: 'p2', partnerName: 'Bob', percentage: 50 },
    ],
    createdAt: '2024-01-01',
  },
];

let mockIsLoading = false;

vi.mock('@/lib/hooks/use-revenue', () => ({
  useRevenueRules: () => ({ data: mockRules, isLoading: mockIsLoading }),
  useCreateRevenueRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRevenueRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRevenueRule: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-partners', () => ({
  usePartners: () => ({ data: mockPartners, isLoading: false }),
}));

import { RevenueTab } from '@/components/features/revenue-tab';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('RevenueTab', () => {
  beforeEach(() => {
    mockIsLoading = false;
  });

  it('renders rule type sections', () => {
    renderWithProviders(<RevenueTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('revenue.project')).toBeInTheDocument();
    expect(screen.getByText('revenue.clientIncome')).toBeInTheDocument();
    expect(screen.getByText('revenue.netProfit')).toBeInTheDocument();
  });

  it('renders rules grouped by type', () => {
    renderWithProviders(<RevenueTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('Project Rule A')).toBeInTheDocument();
    expect(screen.getByText('Client Rule B')).toBeInTheDocument();
  });

  it('renders share percentages for rules', () => {
    renderWithProviders(<RevenueTab companyId="test-id" userRole="Owner" />);

    expect(screen.getAllByText('60%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('40%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows add rule button for Owner', () => {
    renderWithProviders(<RevenueTab companyId="test-id" userRole="Owner" />);

    const addButtons = screen.getAllByText('revenue.addRule');
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows add rule button for Editor', () => {
    renderWithProviders(<RevenueTab companyId="test-id" userRole="Editor" />);

    const addButtons = screen.getAllByText('revenue.addRule');
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows delete button only for Owner', () => {
    const { unmount } = renderWithProviders(<RevenueTab companyId="test-id" userRole="Owner" />);
    const deleteButtons = screen.getAllByText('common.delete');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
    unmount();

    renderWithProviders(<RevenueTab companyId="test-id" userRole="Editor" />);
    expect(screen.queryAllByText('common.delete')).toHaveLength(0);
  });

  it('shows edit button for Editor and Owner', () => {
    renderWithProviders(<RevenueTab companyId="test-id" userRole="Editor" />);

    const editButtons = screen.getAllByText('common.edit');
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders loading spinner when loading', () => {
    mockIsLoading = true;
    const { container } = renderWithProviders(<RevenueTab companyId="test-id" userRole="Owner" />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
