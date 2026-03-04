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

// Mock auth hooks
vi.mock('@/lib/hooks/use-auth', () => ({
  useLogin: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API client
vi.mock('@/lib/api/client', () => ({
  ApiClientError: class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import LoginPage from '@/app/[locale]/(auth)/login/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText('auth.email')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.password')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('button', { name: 'auth.login' })).toBeInTheDocument();
  });

  it('renders signup link', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText('auth.signup')).toBeInTheDocument();
  });
});
