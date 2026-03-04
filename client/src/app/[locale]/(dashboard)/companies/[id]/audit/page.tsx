'use client';

import { useParams } from 'next/navigation';
import { useCompany } from '@/lib/hooks/use-companies';
import { AuditLogTab } from '@/components/features/audit-log-tab';

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company } = useCompany(id);

  if (!company || company.userRole !== 'Owner') return null;

  return <AuditLogTab companyId={id} />;
}
