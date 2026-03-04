import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockMembers = [
  {
    id: 'm1',
    userId: 'u1',
    email: 'owner@example.com',
    fullName: 'Owner User',
    role: 'Owner',
    createdAt: '2024-01-01',
  },
  {
    id: 'm2',
    userId: 'u2',
    email: 'editor@example.com',
    fullName: 'Editor User',
    role: 'Editor',
    createdAt: '2024-01-15',
  },
];

vi.mock('@/lib/hooks/use-members', () => ({
  useMembers: () => ({ data: mockMembers, isLoading: false }),
  useAddMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleEditor: () => ({ mutateAsync: vi.fn() }),
  useRemoveMember: () => ({ mutateAsync: vi.fn() }),
}));

import { MembersTab } from '@/components/features/members-tab';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('MembersTab', () => {
  it('renders member names', () => {
    renderWithProviders(<MembersTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('Owner User')).toBeInTheDocument();
    expect(screen.getByText('Editor User')).toBeInTheDocument();
  });

  it('renders member emails', () => {
    renderWithProviders(<MembersTab companyId="test-id" userRole="Owner" />);

    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('editor@example.com')).toBeInTheDocument();
  });

  it('renders role badges', () => {
    renderWithProviders(<MembersTab companyId="test-id" userRole="Owner" />);

    // members.owner and members.editor may appear in badges + select dropdown items
    const ownerTexts = screen.getAllByText('members.owner');
    expect(ownerTexts.length).toBeGreaterThanOrEqual(1);
    const editorTexts = screen.getAllByText('members.editor');
    expect(editorTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows add button only for Owner', () => {
    const { unmount } = renderWithProviders(<MembersTab companyId="test-id" userRole="Owner" />);
    expect(screen.getByText('members.add')).toBeInTheDocument();
    unmount();

    renderWithProviders(<MembersTab companyId="test-id" userRole="Editor" />);
    expect(screen.queryByText('members.add')).not.toBeInTheDocument();
  });

  it('shows role dropdown and delete for non-Owner members', () => {
    renderWithProviders(<MembersTab companyId="test-id" userRole="Owner" />);

    // Should show delete button for Editor member (non-Owner)
    expect(screen.getByText('common.delete')).toBeInTheDocument();
  });

  it('does not show management controls for Owner members', () => {
    renderWithProviders(<MembersTab companyId="test-id" userRole="Owner" />);

    // Only one delete button (for the Editor), not for the Owner member
    const deleteButtons = screen.getAllByText('common.delete');
    expect(deleteButtons).toHaveLength(1);
  });

  it('Editor viewer sees no management controls', () => {
    renderWithProviders(<MembersTab companyId="test-id" userRole="Editor" />);

    expect(screen.queryByText('members.add')).not.toBeInTheDocument();
    expect(screen.queryByText('common.delete')).not.toBeInTheDocument();
  });
});
