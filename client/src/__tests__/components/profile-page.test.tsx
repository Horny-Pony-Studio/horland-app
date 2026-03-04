import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Mutable mock state for auth store
let mockUser: { id: string; email: string; fullName: string } | null = {
  id: 'u1',
  email: 'john@example.com',
  fullName: 'John Doe',
};

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: () => ({ user: mockUser }),
}));

import ProfilePage from '@/app/[locale]/(dashboard)/profile/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    mockUser = {
      id: 'u1',
      email: 'john@example.com',
      fullName: 'John Doe',
    };
  });

  it('renders user full name', () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders user email', () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('renders initials from full name', () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders single initial for single-word name', () => {
    mockUser = { id: 'u1', email: 'alice@example.com', fullName: 'Alice' };
    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders page title', () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('profile.title')).toBeInTheDocument();
  });

  it('renders back button', () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('common.back')).toBeInTheDocument();
  });

  it('returns null when no user', () => {
    mockUser = null;
    const { container } = renderWithProviders(<ProfilePage />);

    expect(container.innerHTML).toBe('');
  });
});
