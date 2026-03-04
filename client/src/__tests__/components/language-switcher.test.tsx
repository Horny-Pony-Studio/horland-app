import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockReplace = vi.fn();
let mockLocale = 'uk';

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale,
}));

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/companies',
}));

import { LanguageSwitcher } from '@/components/layout/language-switcher';

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = 'uk';
  });

  it('shows EN when current locale is uk', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('shows UA when current locale is en', () => {
    mockLocale = 'en';
    render(<LanguageSwitcher />);
    expect(screen.getByText('UA')).toBeInTheDocument();
  });

  it('switches from uk to en on click', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText('EN'));
    expect(mockReplace).toHaveBeenCalledWith('/companies', { locale: 'en' });
  });

  it('switches from en to uk on click', () => {
    mockLocale = 'en';
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText('UA'));
    expect(mockReplace).toHaveBeenCalledWith('/companies', { locale: 'uk' });
  });
});
