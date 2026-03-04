'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api/audit';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AuditLogPageResponse } from '@/types';

interface AuditLogTabProps {
  companyId: string;
}

export function AuditLogTab({ companyId }: AuditLogTabProps) {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const pageSize = 20;

  const { data, isLoading } = useQuery<AuditLogPageResponse>({
    queryKey: ['audit-log', companyId, page],
    queryFn: () => auditApi.list(companyId, page, pageSize),
    enabled: !!companyId,
  });

  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;

  const uniqueActions = data?.items
    ? Array.from(new Set(data.items.map((item) => item.action)))
    : [];

  const filteredItems = data?.items.filter(
    (item) => actionFilter === 'all' || item.action === actionFilter
  ) ?? [];

  const formatJson = (json: string | null) => {
    if (!json) return '-';
    try {
      const parsed = JSON.parse(json);
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    } catch {
      return json;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">{t('audit.noLogs')}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action filter */}
      {uniqueActions.length > 1 && (
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Log entries */}
      <div className="space-y-2">
        {filteredItems.map((log) => (
          <Card key={log.id} className="rounded-xl border-violet-100">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="rounded-lg text-xs">
                      {log.action}
                    </Badge>
                    <Badge variant="secondary" className="rounded-lg text-xs">
                      {log.entityType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{log.userName}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {log.oldValues && (
                      <div>
                        <span className="text-xs text-muted-foreground">{t('audit.oldValue')}:</span>
                        <p className="text-red-600 text-xs font-mono truncate">{formatJson(log.oldValues)}</p>
                      </div>
                    )}
                    {log.newValues && (
                      <div>
                        <span className="text-xs text-muted-foreground">{t('audit.newValue')}:</span>
                        <p className="text-emerald-600 text-xs font-mono truncate">{formatJson(log.newValues)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('common.back')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
