'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'uk' ? 'en' : 'uk';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale} className="text-sm font-medium">
      {locale === 'uk' ? 'EN' : 'UA'}
    </Button>
  );
}
