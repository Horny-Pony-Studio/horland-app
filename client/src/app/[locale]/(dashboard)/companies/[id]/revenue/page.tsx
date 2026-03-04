'use client';

import { useParams } from 'next/navigation';
import { useCompany } from '@/lib/hooks/use-companies';
import { RevenueTab } from '@/components/features/revenue-tab';

export default function RevenuePage() {
  const { id } = useParams<{ id: string }>();
  const { data: company } = useCompany(id);

  if (!company) return null;

  return <RevenueTab companyId={id} userRole={company.userRole} />;
}
