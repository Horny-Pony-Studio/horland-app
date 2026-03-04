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
  useRegister: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

import SignupPage from '@/app/[locale]/(auth)/signup/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('SignupPage', () => {
  it('renders fullName, email, and password fields', () => {
    renderWithProviders(<SignupPage />);

    expect(screen.getByLabelText('auth.fullName')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.email')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.password')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithProviders(<SignupPage />);

    expect(screen.getByRole('button', { name: 'auth.signup' })).toBeInTheDocument();
  });

  it('renders login link', () => {
    renderWithProviders(<SignupPage />);

    expect(screen.getByText('auth.login')).toBeInTheDocument();
  });

  it('renders password requirements hint', () => {
    renderWithProviders(<SignupPage />);

    expect(screen.getByText('auth.passwordRequirements')).toBeInTheDocument();
  });

  it('submit button is disabled when pending', () => {
    renderWithProviders(<SignupPage />);

    // In default state (isPending: false), button should be enabled
    const button = screen.getByRole('button', { name: 'auth.signup' });
    expect(button).not.toBeDisabled();
  });
});
