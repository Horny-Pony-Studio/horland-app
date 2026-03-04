import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c1' }),
  useSelectedLayoutSegment: () => 'partners',
}));

vi.mock('@/i18n/routing', () => {
  function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  }
  return { Link: MockLink };
});

let mockCompany: Record<string, unknown> | undefined = {
  id: 'c1',
  name: 'Test Corp',
  type: 'Company',
  userRole: 'Owner',
  totalShares: 100,
  partnersCount: 3,
};
let mockIsLoading = false;

vi.mock('@/lib/hooks/use-companies', () => ({
  useCompany: () => ({ data: mockCompany, isLoading: mockIsLoading }),
}));

import CompanyLayout from '@/app/[locale]/(dashboard)/companies/[id]/layout';

describe('CompanyLayout', () => {
  beforeEach(() => {
    mockCompany = {
      id: 'c1',
      name: 'Test Corp',
      type: 'Company',
      userRole: 'Owner',
      totalShares: 100,
      partnersCount: 3,
    };
    mockIsLoading = false;
  });

  it('renders company name', () => {
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(screen.getByText('Test Corp')).toBeInTheDocument();
  });

  it('renders company type badge', () => {
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(screen.getByText('companies.company')).toBeInTheDocument();
  });

  it('renders project type badge', () => {
    mockCompany = { ...mockCompany!, type: 'Project' };
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(screen.getByText('companies.project')).toBeInTheDocument();
  });

  it('renders role badge for Owner', () => {
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(screen.getByText('members.owner')).toBeInTheDocument();
  });

  it('renders role badge for Editor', () => {
    mockCompany = { ...mockCompany!, userRole: 'Editor' };
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(screen.getByText('members.editor')).toBeInTheDocument();
  });

  it('renders total shares and partners count', () => {
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(screen.getByText('common.back')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<CompanyLayout><div>child content</div></CompanyLayout>);
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders loading spinner when loading', () => {
    mockIsLoading = true;
    const { container } = render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders null when no company', () => {
    mockCompany = undefined;
    const { container } = render(<CompanyLayout><div>child</div></CompanyLayout>);
    expect(container.innerHTML).toBe('');
  });

  it('renders settings and audit tabs only for Owner', () => {
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    // Owner should see 5 tabbar links (partners, revenue, agreement, settings, audit)
    const links = screen.getAllByRole('link');
    const settingsLink = links.find(l => l.getAttribute('href')?.includes('settings'));
    const auditLink = links.find(l => l.getAttribute('href')?.includes('audit'));
    expect(settingsLink).toBeDefined();
    expect(auditLink).toBeDefined();
  });

  it('does not render settings and audit tabs for Editor', () => {
    mockCompany = { ...mockCompany!, userRole: 'Editor' };
    render(<CompanyLayout><div>child</div></CompanyLayout>);
    const links = screen.getAllByRole('link');
    const settingsLink = links.find(l => l.getAttribute('href')?.includes('settings'));
    const auditLink = links.find(l => l.getAttribute('href')?.includes('audit'));
    expect(settingsLink).toBeUndefined();
    expect(auditLink).toBeUndefined();
  });
});
