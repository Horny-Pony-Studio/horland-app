'use client';

import { useParams, useSelectedLayoutSegment } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCompany } from '@/lib/hooks/use-companies';
import { Badge } from '@/components/ui/badge';
import { Tabbar, TabbarLink } from '@/components/ui/tabbar';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, FileText, Settings, ClipboardList } from 'lucide-react';

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const { data: company, isLoading } = useCompany(id);
  const segment = useSelectedLayoutSegment();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Link href="/companies">
          <Button variant="ghost" size="sm" className="rounded-lg">{t('common.back')}</Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-violet-950 truncate">{company.name}</h1>
            <Badge variant="outline" className="rounded-lg shrink-0">
              {company.type === 'Company' ? t('companies.company') : t('companies.project')}
            </Badge>
            <Badge variant="secondary" className="rounded-lg shrink-0">
              {company.userRole === 'Owner'
                ? t('members.owner')
                : company.userRole === 'Editor'
                  ? t('members.editor')
                  : t('members.viewer')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('partners.totalShares')}: {company.totalShares}% | {company.partnersCount} {t('companies.partners').toLowerCase()}
          </p>
        </div>
      </div>

      {children}

      <Tabbar icons>
        <TabbarLink
          active={segment === 'partners' || segment === null}
          icon={<Users className="w-5 h-5" />}
          href={`/companies/${id}/partners`}
        />
        <TabbarLink
          active={segment === 'revenue'}
          icon={<DollarSign className="w-5 h-5" />}
          href={`/companies/${id}/revenue`}
        />
        <TabbarLink
          active={segment === 'agreement'}
          icon={<FileText className="w-5 h-5" />}
          href={`/companies/${id}/agreement`}
        />
        {company.userRole === 'Owner' && (
          <>
            <TabbarLink
              active={segment === 'settings'}
              icon={<Settings className="w-5 h-5" />}
              href={`/companies/${id}/settings`}
            />
            <TabbarLink
              active={segment === 'audit'}
              icon={<ClipboardList className="w-5 h-5" />}
              href={`/companies/${id}/audit`}
            />
          </>
        )}
      </Tabbar>
    </div>
  );
}
