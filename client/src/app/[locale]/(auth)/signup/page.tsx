'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '@/lib/validators/auth';
import { useRegister } from '@/lib/hooks/use-auth';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { ApiClientError } from '@/lib/api/client';

export default function SignupPage() {
  const t = useTranslations();
  const router = useRouter();
  const register = useRegister();
  const [error, setError] = useState('');

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', fullName: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    try {
      await register.mutateAsync(data);
      router.push('/companies');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.status === 409 ? t('auth.emailTaken') : err.message);
      }
    }
  };

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-lg border-violet-100">
      <CardHeader className="text-center space-y-1">
        <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mx-auto mb-2">
          <span className="text-white text-lg font-bold">H</span>
        </div>
        <CardTitle className="text-2xl">{t('auth.signupTitle')}</CardTitle>
        <CardDescription>{t('auth.welcomeDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('auth.fullName')}</Label>
            <Input
              id="fullName"
              className="rounded-lg"
              {...form.register('fullName')}
            />
            {form.formState.errors.fullName && (
              <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
            )}
          </div>
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
            <p className="text-xs text-muted-foreground">{t('auth.passwordRequirements')}</p>
          </div>
          <Button type="submit" className="w-full rounded-xl h-11" disabled={register.isPending}>
            {register.isPending ? t('common.loading') : t('auth.signup')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="text-violet-600 hover:underline font-medium">
              {t('auth.login')}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
