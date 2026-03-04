'use client';

import { useParams } from 'next/navigation';
import { useCompany } from '@/lib/hooks/use-companies';
import { MembersTab } from '@/components/features/members-tab';

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company } = useCompany(id);

  if (!company || company.userRole !== 'Owner') return null;

  return <MembersTab companyId={id} userRole={company.userRole} />;
}
