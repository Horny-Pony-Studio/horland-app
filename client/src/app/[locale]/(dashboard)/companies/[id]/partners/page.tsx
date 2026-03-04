'use client';

import { useParams } from 'next/navigation';
import { useCompany } from '@/lib/hooks/use-companies';
import { PartnersTab } from '@/components/features/partners-tab';

export default function PartnersPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company } = useCompany(id);

  if (!company) return null;

  return <PartnersTab companyId={id} userRole={company.userRole} />;
}
