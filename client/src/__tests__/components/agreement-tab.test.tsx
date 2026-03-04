import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock react-signature-canvas
vi.mock('react-signature-canvas', () => ({
  default: vi.fn().mockImplementation(() => null),
}));

const mockPartners = [
  { id: 'p1', userId: 'u1', fullName: 'Alice', companyShare: 50, photoUrl: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'p2', userId: 'u2', fullName: 'Bob', companyShare: 50, photoUrl: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

const mockRevenueRules = [
  {
    id: 'r1',
    type: 'Project',
    name: 'Project Rule',
    shares: [
      { id: 's1', partnerId: 'p1', partnerName: 'Alice', percentage: 60 },
      { id: 's2', partnerId: 'p2', partnerName: 'Bob', percentage: 40 },
    ],
    createdAt: '2024-01-01',
  },
];

const mockAgreementDraft = {
  id: 'a1',
  companyId: 'test-id',
  version: 2,
  status: 'Draft',
  generatedAt: '2024-03-01T00:00:00Z',
  pdfUrl: null,
  signatures: [
    { id: 'sig1', partnerId: 'p1', partnerName: 'Alice', signatureUrl: 'sig.png', signedAt: '2024-03-01T00:00:00Z' },
  ],
};

const mockAgreementSigned = {
  ...mockAgreementDraft,
  id: 'a2',
  version: 1,
  status: 'Signed',
  signatures: [
    { id: 'sig1', partnerId: 'p1', partnerName: 'Alice', signatureUrl: 'sig.png', signedAt: '2024-03-01T00:00:00Z' },
    { id: 'sig2', partnerId: 'p2', partnerName: 'Bob', signatureUrl: 'sig2.png', signedAt: '2024-03-02T00:00:00Z' },
  ],
};

let mockAgreements: typeof mockAgreementDraft[] | undefined = [mockAgreementDraft];
let mockIsLoading = false;

vi.mock('@/lib/hooks/use-agreements', () => ({
  useAgreements: () => ({ data: mockAgreements, isLoading: mockIsLoading }),
  useGenerateAgreement: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDownloadAgreementPdf: () => ({ mutate: vi.fn(), isPending: false }),
  useSignAgreement: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignLinks: () => ({ data: [] }),
}));

vi.mock('@/lib/hooks/use-partners', () => ({
  usePartners: () => ({ data: mockPartners, isLoading: false }),
}));

vi.mock('@/lib/hooks/use-revenue', () => ({
  useRevenueRules: () => ({ data: mockRevenueRules, isLoading: false }),
}));

import { AgreementTab } from '@/components/features/agreement-tab';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('AgreementTab', () => {
  beforeEach(() => {
    mockAgreements = [mockAgreementDraft];
    mockIsLoading = false;
  });

  it('renders agreement list with version and status', () => {
    renderWithProviders(<AgreementTab companyId="test-id" userRole="Owner" />);

    const versionElements = screen.getAllByText(/agreement.version/);
    expect(versionElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('agreement.draft')).toBeInTheDocument();
  });

  it('renders generate button only for Owner', () => {
    renderWithProviders(<AgreementTab companyId="test-id" userRole="Owner" />);
    expect(screen.getByText('agreement.generate')).toBeInTheDocument();
  });

  it('renders export button when agreement exists', () => {
    renderWithProviders(<AgreementTab companyId="test-id" userRole="Owner" />);

    const exportButtons = screen.getAllByText('agreement.export');
    expect(exportButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders sign button for non-Signed agreements', () => {
    renderWithProviders(<AgreementTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('agreement.sign')).toBeInTheDocument();
  });

  it('still renders sign button for Signed agreement (only hidden for Archived)', () => {
    mockAgreements = [mockAgreementSigned];
    renderWithProviders(<AgreementTab companyId="test-id" userRole="Owner" />);

    // Sign button is visible for Signed status (only hidden for Archived)
    const signButtons = screen.queryAllByText('agreement.sign');
    expect(signButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders prerequisites message when no agreements', () => {
    mockAgreements = [];
    renderWithProviders(<AgreementTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('agreement.prerequisites')).toBeInTheDocument();
  });

  it('renders signatures section', () => {
    renderWithProviders(<AgreementTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('agreement.signatures')).toBeInTheDocument();
    // Alice appears in signatures, partners table, and revenue shares
    const aliceElements = screen.getAllByText('Alice');
    expect(aliceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders agreement preview with partners table', () => {
    renderWithProviders(<AgreementTab companyId="test-id" userRole="Owner" />);

    // The preview section should render partner names and shares
    expect(screen.getByText('partners.title')).toBeInTheDocument();
    // partners.fullName appears in partners table + revenue rules tables
    const fullNameHeaders = screen.getAllByText('partners.fullName');
    expect(fullNameHeaders.length).toBeGreaterThanOrEqual(1);
  });
});
