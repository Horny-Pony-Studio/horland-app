import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockAuditData = {
  items: [
    {
      id: 'log1',
      userId: 'u1',
      userName: 'John Doe',
      action: 'Created',
      entityType: 'Partner',
      entityId: 'e1',
      oldValues: null,
      newValues: '{"FullName":"Alice","CompanyShare":50}',
      createdAt: '2024-03-01T10:00:00Z',
    },
    {
      id: 'log2',
      userId: 'u1',
      userName: 'John Doe',
      action: 'Updated',
      entityType: 'Company',
      entityId: 'e2',
      oldValues: '{"Name":"Old Co"}',
      newValues: '{"Name":"New Co"}',
      createdAt: '2024-03-02T10:00:00Z',
    },
    {
      id: 'log3',
      userId: 'u2',
      userName: 'Jane Smith',
      action: 'Created',
      entityType: 'RevenueRule',
      entityId: 'e3',
      oldValues: null,
      newValues: '{"Name":"Rule A"}',
      createdAt: '2024-03-03T10:00:00Z',
    },
  ],
  totalCount: 3,
  page: 1,
  pageSize: 20,
};

let mockData: typeof mockAuditData | undefined = mockAuditData;
let mockIsLoading = false;

vi.mock('@/lib/api/audit', () => ({
  auditApi: {
    list: vi.fn().mockImplementation(() => Promise.resolve(mockData)),
  },
}));

// We also need to mock useQuery to return our data directly
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: mockData, isLoading: mockIsLoading }),
  };
});

import { AuditLogTab } from '@/components/features/audit-log-tab';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('AuditLogTab', () => {
  beforeEach(() => {
    mockData = mockAuditData;
    mockIsLoading = false;
  });

  it('renders audit log entries', () => {
    renderWithProviders(<AuditLogTab companyId="test-id" />);

    expect(screen.getAllByText('Created').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('renders entity type badges', () => {
    renderWithProviders(<AuditLogTab companyId="test-id" />);

    expect(screen.getByText('Partner')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('RevenueRule')).toBeInTheDocument();
  });

  it('renders user names', () => {
    renderWithProviders(<AuditLogTab companyId="test-id" />);

    expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders old and new values', () => {
    renderWithProviders(<AuditLogTab companyId="test-id" />);

    // The formatJson function should display parsed values
    expect(screen.getByText(/Old Co/)).toBeInTheDocument();
    expect(screen.getByText(/New Co/)).toBeInTheDocument();
  });

  it('renders empty state when no logs', () => {
    mockData = { items: [], totalCount: 0, page: 1, pageSize: 20 };
    renderWithProviders(<AuditLogTab companyId="test-id" />);

    expect(screen.getByText('audit.noLogs')).toBeInTheDocument();
  });

  it('renders pagination when multiple pages', () => {
    mockData = { ...mockAuditData, totalCount: 50, pageSize: 20 };
    renderWithProviders(<AuditLogTab companyId="test-id" />);

    expect(screen.getByText('common.back')).toBeInTheDocument();
    expect(screen.getByText('common.next')).toBeInTheDocument();
  });

  it('back button disabled on first page', () => {
    mockData = { ...mockAuditData, totalCount: 50, pageSize: 20, page: 1 };
    renderWithProviders(<AuditLogTab companyId="test-id" />);

    const backButton = screen.getByText('common.back').closest('button');
    expect(backButton).toBeDisabled();
  });

  it('renders action filter when multiple action types', () => {
    renderWithProviders(<AuditLogTab companyId="test-id" />);

    // The filter should appear since there are 2 unique actions (Created, Updated)
    expect(screen.getByText('common.all')).toBeInTheDocument();
  });
});
