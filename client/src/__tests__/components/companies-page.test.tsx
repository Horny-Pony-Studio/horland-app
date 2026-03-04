import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => {
  function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  }
  return {
    Link: MockLink,
    useRouter: () => ({ push: vi.fn() }),
  };
});

const mockCompanies = [
  {
    id: '1',
    name: 'Alpha Corp',
    type: 'Company',
    partnersCount: 3,
    userRole: 'Owner',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Beta Project',
    type: 'Project',
    partnersCount: 2,
    userRole: 'Editor',
    createdAt: '2024-02-20',
  },
];

let mockIsLoading = false;
let mockData: typeof mockCompanies | undefined = mockCompanies;

vi.mock('@/lib/hooks/use-companies', () => ({
  useCompanies: () => ({ data: mockData, isLoading: mockIsLoading }),
  useCreateCompany: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import CompaniesPage from '@/app/[locale]/(dashboard)/companies/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('CompaniesPage', () => {
  beforeEach(() => {
    mockIsLoading = false;
    mockData = mockCompanies;
  });

  it('renders companies list', () => {
    renderWithProviders(<CompaniesPage />);

    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Project')).toBeInTheDocument();
  });

  it('renders company type badges', () => {
    renderWithProviders(<CompaniesPage />);

    expect(screen.getByText('companies.company')).toBeInTheDocument();
    expect(screen.getByText('companies.project')).toBeInTheDocument();
  });

  it('renders user role badges', () => {
    renderWithProviders(<CompaniesPage />);

    expect(screen.getByText('members.owner')).toBeInTheDocument();
    expect(screen.getByText('members.editor')).toBeInTheDocument();
  });

  it('renders create button', () => {
    renderWithProviders(<CompaniesPage />);

    expect(screen.getByText('companies.create')).toBeInTheDocument();
  });

  it('renders empty state when no companies', () => {
    mockData = [];
    renderWithProviders(<CompaniesPage />);

    expect(screen.getByText('companies.noCompanies')).toBeInTheDocument();
  });

  it('renders loading spinner when loading', () => {
    mockIsLoading = true;
    const { container } = renderWithProviders(<CompaniesPage />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders partner count for each company', () => {
    renderWithProviders(<CompaniesPage />);

    expect(screen.getByText(/3 companies.partners/i)).toBeInTheDocument();
    expect(screen.getByText(/2 companies.partners/i)).toBeInTheDocument();
  });
});
