'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRevenueRules, useCreateRevenueRule, useUpdateRevenueRule, useDeleteRevenueRule } from '@/lib/hooks/use-revenue';
import { usePartners } from '@/lib/hooks/use-partners';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { RevenueRuleResponse, RevenueShareInput } from '@/types';

interface RevenueTabProps {
  companyId: string;
  userRole: string;
}

const RULE_TYPES = ['Project', 'ClientIncome', 'NetProfit'] as const;

export function RevenueTab({ companyId, userRole }: RevenueTabProps) {
  const t = useTranslations();
  const { data: rules, isLoading } = useRevenueRules(companyId);
  const { data: partners } = usePartners(companyId);
  const createRule = useCreateRevenueRule(companyId);
  const updateRule = useUpdateRevenueRule(companyId);
  const deleteRule = useDeleteRevenueRule(companyId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RevenueRuleResponse | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<string>('Project');
  const [shares, setShares] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const canEdit = userRole === 'Owner' || userRole === 'Editor';
  const canDelete = userRole === 'Owner';

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'Project': return t('revenue.project');
      case 'ClientIncome': return t('revenue.clientIncome');
      case 'NetProfit': return t('revenue.netProfit');
      default: return type;
    }
  };

  const openCreateDialog = (type: string) => {
    setEditingRule(null);
    setRuleName('');
    setRuleType(type);
    setError('');
    const initialShares: Record<string, string> = {};
    partners?.forEach(p => { initialShares[p.id] = ''; });
    setShares(initialShares);
    setDialogOpen(true);
  };

  const openEditDialog = (rule: RevenueRuleResponse) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleType(rule.type);
    setError('');
    const editShares: Record<string, string> = {};
    partners?.forEach(p => {
      const existing = rule.shares.find(s => s.partnerId === p.id);
      editShares[p.id] = existing ? existing.percentage.toString() : '';
    });
    setShares(editShares);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!ruleName.trim()) {
      setError(t('errors.required'));
      return;
    }

    const shareInputs: RevenueShareInput[] = [];
    let sum = 0;
    for (const [partnerId, pct] of Object.entries(shares)) {
      const val = parseFloat(pct);
      if (!isNaN(val) && val > 0) {
        shareInputs.push({ partnerId, percentage: val });
        sum += val;
      }
    }

    if (Math.abs(sum - 100) > 0.01) {
      setError(t('revenue.sharesMustSum'));
      return;
    }

    try {
      if (editingRule) {
        await updateRule.mutateAsync({
          ruleId: editingRule.id,
          data: { name: ruleName.trim(), shares: shareInputs },
        });
      } else {
        await createRule.mutateAsync({
          type: ruleType,
          name: ruleName.trim(),
          shares: shareInputs,
        });
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm(t('companies.deleteConfirm'))) return;
    await deleteRule.mutateAsync(ruleId);
  };

  const currentSum = Object.values(shares).reduce((sum, v) => {
    const val = parseFloat(v);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {RULE_TYPES.map((type) => {
        const typeRules = rules?.filter(r => r.type === type) ?? [];
        return (
          <Card key={type} className="rounded-2xl border-violet-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{getRuleTypeLabel(type)}</CardTitle>
                {canEdit && (
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openCreateDialog(type)}>
                    {t('revenue.addRule')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {typeRules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t('revenue.noRules')}</p>
              ) : (
                <div className="space-y-3">
                  {typeRules.map((rule, idx) => (
                    <div key={rule.id}>
                      {idx > 0 && <Separator className="my-3" />}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{rule.name}</span>
                        <div className="flex gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="text-xs rounded-lg" onClick={() => openEditDialog(rule)}>
                              {t('common.edit')}
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" className="text-xs text-destructive rounded-lg" onClick={() => handleDelete(rule.id)}>
                              {t('common.delete')}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {rule.shares.map(share => (
                          <div key={share.id} className="flex items-center justify-between bg-violet-50 rounded-lg px-3 py-2">
                            <span className="text-sm truncate">{share.partnerName}</span>
                            <Badge variant="secondary" className="ml-2 rounded-lg">{share.percentage}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? t('common.edit') : t('revenue.addRule')} — {getRuleTypeLabel(ruleType)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div className="space-y-2">
              <Label>{t('revenue.ruleName')}</Label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="rounded-lg"
                placeholder={t('revenue.ruleName')}
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('revenue.percentage')}</Label>
                <span className={`text-sm font-medium ${Math.abs(currentSum - 100) < 0.01 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {currentSum.toFixed(1)}% / 100%
                </span>
              </div>
              {partners?.map(partner => (
                <div key={partner.id} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate">{partner.fullName}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={shares[partner.id] || ''}
                    onChange={(e) => setShares(prev => ({ ...prev, [partner.id]: e.target.value }))}
                    className="w-24 rounded-lg text-right"
                    placeholder="0"
                  />
                  <span className="text-sm text-muted-foreground w-4">%</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleSave}
              className="w-full rounded-xl"
              disabled={createRule.isPending || updateRule.isPending}
            >
              {(createRule.isPending || updateRule.isPending) ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
