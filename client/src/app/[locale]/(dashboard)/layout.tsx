'use client';

import { useEffect } from 'react';
import { useCurrentUser, useLogout } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Link } from '@/i18n/routing';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const router = useRouter();
  const { isLoading: isLoadingUser } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && !isLoadingUser && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isLoadingUser, router]);

  if (isLoading || isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-violet-50/30">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/companies" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">H</span>
            </div>
            <span className="font-semibold text-violet-950 hidden sm:inline">HORAND</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="text-sm text-muted-foreground hidden sm:inline hover:text-violet-700 transition-colors">
              {user?.fullName}
            </Link>
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={() => logout.mutate()} className="text-muted-foreground">
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
