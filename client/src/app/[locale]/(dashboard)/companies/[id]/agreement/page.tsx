'use client';

import { useParams } from 'next/navigation';
import { useCompany } from '@/lib/hooks/use-companies';
import { AgreementTab } from '@/components/features/agreement-tab';

export default function AgreementPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company } = useCompany(id);

  if (!company) return null;

  return <AgreementTab companyId={id} userRole={company.userRole} />;
}
