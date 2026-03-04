'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

export default function ProfilePage() {
  const t = useTranslations();
  const { user } = useAuthStore();

  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/companies">
          <Button variant="ghost" size="sm" className="rounded-lg">
            {t('common.back')}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-violet-950">{t('profile.title')}</h1>
      </div>

      <Card className="rounded-2xl border-violet-100 max-w-md">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Avatar className="w-20 h-20 rounded-xl">
            <AvatarFallback className="rounded-xl bg-violet-100 text-violet-700 text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-violet-950">{user.fullName}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
