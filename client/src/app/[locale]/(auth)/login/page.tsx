'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validators/auth';
import { useLogin } from '@/lib/hooks/use-auth';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const login = useLogin();
  const [error, setError] = useState('');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    try {
      await login.mutateAsync(data);
      router.push(redirectTo || '/companies');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.status === 401 ? t('auth.invalidCredentials') : err.message);
      }
    }
  };

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-lg border-violet-100">
      <CardHeader className="text-center space-y-1">
        <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mx-auto mb-2">
          <span className="text-white text-lg font-bold">H</span>
        </div>
        <CardTitle className="text-2xl">{t('auth.loginTitle')}</CardTitle>
        <CardDescription>{t('auth.welcomeDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              className="rounded-lg"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              className="rounded-lg"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full rounded-xl h-11" disabled={login.isPending}>
            {login.isPending ? t('common.loading') : t('auth.login')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link href="/signup" className="text-violet-600 hover:underline font-medium">
              {t('auth.signup')}
            </Link>
          </p>
        </form>

        <div className="mt-4 border-t border-violet-100 pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('auth.testAccounts')}</p>
          <div className="space-y-1.5">
            {[
              { name: 'Demo (Owner)', email: 'demo@horand.com', password: 'Demo1234!' },
              { name: 'Editor', email: 'editor@horand.com', password: 'Editor1234!' },
              { name: 'Іван Петренко', email: 'ivan@horand.com', password: 'Ivan1234!' },
              { name: 'Олена Коваленко', email: 'olena@horand.com', password: 'Olena1234!' },
              { name: 'Андрій Шевченко', email: 'andriy@horand.com', password: 'Andriy1234!' },
            ].map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="w-full flex items-center justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs hover:bg-violet-100 transition-colors text-left"
                onClick={() => {
                  form.setValue('email', acc.email);
                  form.setValue('password', acc.password);
                }}
              >
                <span className="font-medium text-violet-900">{acc.name}</span>
                <span className="text-muted-foreground">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
