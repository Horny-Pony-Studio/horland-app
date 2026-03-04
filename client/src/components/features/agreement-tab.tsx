'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, ExternalLink } from 'lucide-react';
import {
  useAgreements,
  useGenerateAgreement,
  useDownloadAgreementPdf,
  useSignAgreement,
  useSignLinks,
} from '@/lib/hooks/use-agreements';
import { usePartners } from '@/lib/hooks/use-partners';
import { useRevenueRules } from '@/lib/hooks/use-revenue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { AgreementResponse, RevenueRuleResponse } from '@/types';
import SignatureCanvas from 'react-signature-canvas';

interface AgreementTabProps {
  companyId: string;
  userRole: string;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-yellow-100 text-yellow-800',
  Active: 'bg-emerald-100 text-emerald-800',
  Signed: 'bg-violet-100 text-violet-800',
  Archived: 'bg-gray-100 text-gray-600',
};

export function AgreementTab({ companyId, userRole }: AgreementTabProps) {
  const t = useTranslations();
  const { data: agreements, isLoading } = useAgreements(companyId);
  const { data: partners } = usePartners(companyId);
  const { data: revenueRules } = useRevenueRules(companyId);
  const generateAgreement = useGenerateAgreement(companyId);
  const downloadPdf = useDownloadAgreementPdf(companyId);
  const signAgreement = useSignAgreement(companyId);
  const latestId = agreements?.[0]?.id ?? '';
  const { data: signLinks } = useSignLinks(companyId, latestId);

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementResponse | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const copyToClipboard = useCallback((text: string, token: string) => {
    const fallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }, []);

  const isOwner = userRole === 'Owner';

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Draft': return t('agreement.draft');
      case 'Active': return t('agreement.active');
      case 'Signed': return t('agreement.signed');
      case 'Archived': return t('agreement.archived');
      default: return status;
    }
  };

  const handleGenerate = async () => {
    try {
      await generateAgreement.mutateAsync();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error generating agreement');
    }
  };

  const handleDownload = (agreementId: string) => {
    downloadPdf.mutate(agreementId);
  };

  const openSignDialog = (agreement: AgreementResponse) => {
    setSelectedAgreement(agreement);
    setSignDialogOpen(true);
  };

  const handleSign = useCallback(async () => {
    if (!sigCanvasRef.current || !selectedAgreement) return;

    if (sigCanvasRef.current.isEmpty()) {
      alert(t('agreement.drawSignature'));
      return;
    }

    const canvas = sigCanvasRef.current.getCanvas();
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    try {
      await signAgreement.mutateAsync({
        agreementId: selectedAgreement.id,
        signature: blob,
      });
      setSignDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error signing');
    }
  }, [selectedAgreement, signAgreement, t]);

  const latestAgreement = agreements?.[0];
  const previewAgreement = agreements?.find((a) => a.status !== 'Archived') ?? latestAgreement;

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'Project': return t('revenue.project');
      case 'ClientIncome': return t('revenue.clientIncome');
      case 'NetProfit': return t('revenue.netProfit');
      default: return type;
    }
  };

  const groupedRules = revenueRules?.reduce<Record<string, RevenueRuleResponse[]>>((acc, rule) => {
    if (!acc[rule.type]) acc[rule.type] = [];
    acc[rule.type].push(rule);
    return acc;
  }, {}) ?? {};

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isOwner && (
          <Button
            onClick={handleGenerate}
            className="rounded-xl"
            disabled={generateAgreement.isPending}
          >
            {generateAgreement.isPending ? t('common.loading') : t('agreement.generate')}
          </Button>
        )}
        {latestAgreement && (
          <>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => handleDownload(latestAgreement.id)}
              disabled={downloadPdf.isPending}
            >
              {downloadPdf.isPending ? t('common.loading') : t('agreement.export')}
            </Button>
            {latestAgreement.status !== 'Archived' && (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => openSignDialog(latestAgreement)}
              >
                {t('agreement.sign')}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Sign links */}
      {signLinks && signLinks.length > 0 && latestId && (
        <Card className="rounded-2xl border-violet-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('agreement.signLinks')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('agreement.signLinksDesc')}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {signLinks.map((link) => {
              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/sign/${link.token}`;
              const isCopied = copiedToken === link.token;
              return (
                <div key={link.partnerId} className="bg-violet-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${link.signed ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <span className="text-sm font-medium">{link.partnerName}</span>
                    </div>
                    {link.signed ? (
                      <Badge className="rounded-lg bg-emerald-100 text-emerald-800 text-xs">{t('agreement.signed')}</Badge>
                    ) : (
                      <Badge className="rounded-lg bg-amber-100 text-amber-800 text-xs">{t('agreement.pending')}</Badge>
                    )}
                  </div>
                  {!link.signed && (
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={url}
                        className="flex-1 text-xs bg-white border border-violet-200 rounded-lg px-2 py-1.5 text-muted-foreground select-all"
                        onFocus={(e) => e.target.select()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg shrink-0 h-8 w-8 p-0"
                        onClick={() => copyToClipboard(url, link.token)}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="rounded-lg shrink-0 h-8 w-8 p-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Prerequisites info */}
      {!agreements?.length && (
        <Card className="rounded-2xl border-violet-100">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('agreement.prerequisites')}</p>
          </CardContent>
        </Card>
      )}

      {/* Agreements list */}
      {agreements?.map((agreement) => (
        <Card key={agreement.id} className="rounded-2xl border-violet-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {t('agreement.title')} — {t('agreement.version')} {agreement.version}
              </CardTitle>
              <Badge className={`rounded-lg ${STATUS_COLORS[agreement.status] || ''}`}>
                {getStatusLabel(agreement.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(agreement.generatedAt).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Signatures section */}
            {agreement.signatures.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">{t('agreement.signatures')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {agreement.signatures.map((sig) => (
                      <div
                        key={sig.id}
                        className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2"
                      >
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-sm truncate">{sig.partnerName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(sig.signedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Agreement preview */}
            {agreement.id === previewAgreement?.id && partners && partners.length > 0 && (
              <>
                <Separator />
                <div className="border border-violet-200 rounded-xl p-4 space-y-4 bg-white">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold text-violet-950">{t('agreement.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('agreement.version')} {agreement.version} &mdash; {new Date(agreement.generatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Partners table */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{t('partners.title')}</h4>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-violet-200">
                          <th className="text-left py-1 px-2">{t('partners.fullName')}</th>
                          <th className="text-right py-1 px-2">{t('partners.share')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partners.map((p) => (
                          <tr key={p.id} className="border-b border-violet-100">
                            <td className="py-1 px-2">{p.fullName}</td>
                            <td className="py-1 px-2 text-right">{p.companyShare}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Revenue rules by type */}
                  {Object.entries(groupedRules).map(([type, rules]) => (
                    <div key={type}>
                      <h4 className="text-sm font-semibold mb-2">{getRuleTypeLabel(type)}</h4>
                      {rules.map((rule) => (
                        <div key={rule.id} className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{rule.name}</p>
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-violet-200">
                                <th className="text-left py-1 px-2">{t('partners.fullName')}</th>
                                <th className="text-right py-1 px-2">{t('revenue.percentage')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rule.shares.map((s) => (
                                <tr key={s.id} className="border-b border-violet-100">
                                  <td className="py-1 px-2">{s.partnerName}</td>
                                  <td className="py-1 px-2 text-right">{s.percentage}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Actions for this agreement */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg text-xs"
                onClick={() => handleDownload(agreement.id)}
              >
                {t('agreement.export')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('agreement.sign')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('agreement.drawSignature')}</Label>
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
              disabled={signAgreement.isPending}
            >
              {signAgreement.isPending ? t('common.loading') : t('agreement.sign')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
