'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export default function WelcomePage() {
  const t = useTranslations('auth');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-purple-50 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="text-center max-w-md space-y-6">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">H</span>
          </div>
          <h1 className="text-3xl font-bold text-violet-950">HORAND</h1>
          <p className="text-lg text-violet-600 font-medium">Partnership</p>
        </div>
        <p className="text-muted-foreground">{t('welcomeDesc')}</p>
        <div className="flex flex-col gap-3 pt-4">
          <Link href="/login">
            <Button className="w-full rounded-xl h-12 text-base" size="lg">{t('login')}</Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="w-full rounded-xl h-12 text-base" size="lg">{t('signup')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
