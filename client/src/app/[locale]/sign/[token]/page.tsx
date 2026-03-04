'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { publicSignApi } from '@/lib/api/agreements';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCurrentUser } from '@/lib/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SignatureCanvas from 'react-signature-canvas';

export default function PublicSignPage() {
  const { token } = useParams<{ token: string }>();
  const t = useTranslations();
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [signed, setSigned] = useState(false);
  useCurrentUser();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const { data: info, isLoading, error } = useQuery({
    queryKey: ['sign-info', token],
    queryFn: () => publicSignApi.getInfo(token),
    enabled: !!token && isAuthenticated,
  });

  const signMutation = useMutation({
    mutationFn: (blob: Blob) => publicSignApi.sign(token, blob),
    onSuccess: () => setSigned(true),
  });

  const handleSign = useCallback(async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      alert(t('agreement.drawSignature'));
      return;
    }

    const canvas = sigCanvasRef.current.getCanvas();
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    signMutation.mutate(blob);
  }, [signMutation, t]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-violet-50">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-violet-50 p-4">
        <Card className="rounded-2xl max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mx-auto">
              <span className="text-white text-lg font-bold">H</span>
            </div>
            <h2 className="text-lg font-semibold text-violet-950">{t('agreement.loginRequired')}</h2>
            <p className="text-sm text-muted-foreground">{t('agreement.loginRequiredDesc')}</p>
            <Link href={`/login?redirect=/sign/${token}`}>
              <Button className="w-full rounded-xl">{t('agreement.loginToSign')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-violet-50">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    const isForbidden = error instanceof ApiClientError && error.status === 403;
    return (
      <div className="min-h-screen flex items-center justify-center bg-violet-50">
        <Card className="rounded-2xl max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">
              {isForbidden ? t('agreement.wrongPartner') : t('agreement.invalidSignLink')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-violet-50">
        <Card className="rounded-2xl max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{t('agreement.invalidSignLink')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (info.alreadySigned || signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-violet-50">
        <Card className="rounded-2xl max-w-md w-full mx-4">
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-emerald-600 text-xl">✓</span>
            </div>
            <h2 className="text-lg font-semibold text-violet-950">
              {signed ? t('agreement.signSuccess') : t('agreement.alreadySigned')}
            </h2>
            <p className="text-sm text-muted-foreground">{info.companyName} — v{info.version}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50 p-4">
      <Card className="rounded-2xl max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center mx-auto mb-2">
            <span className="text-white text-sm font-bold">H</span>
          </div>
          <CardTitle className="text-xl">{t('agreement.publicSign')}</CardTitle>
          <p className="text-sm text-muted-foreground">{info.companyName}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge className="rounded-lg bg-violet-100 text-violet-800">
              {t('agreement.version')} {info.version}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm font-medium text-violet-950">{info.partnerName}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('agreement.drawSignature')}</p>
            <div className="border-2 border-dashed border-violet-200 rounded-xl overflow-hidden bg-white">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#5B21B6"
                canvasProps={{
                  width: 440,
                  height: 200,
                  className: 'w-full',
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs rounded-lg"
              onClick={() => sigCanvasRef.current?.clear()}
            >
              {t('agreement.clearSignature')}
            </Button>
          </div>

          <Button
            onClick={handleSign}
            className="w-full rounded-xl"
            disabled={signMutation.isPending}
          >
            {signMutation.isPending ? t('common.loading') : t('agreement.publicSign')}
          </Button>

          {signMutation.error && (
            <p className="text-sm text-red-600 text-center">
              {signMutation.error instanceof Error ? signMutation.error.message : 'Error signing'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
