'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCompanies, useCreateCompany } from '@/lib/hooks/use-companies';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CompaniesPage() {
  const t = useTranslations();
  const { data: companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Company');

  const handleCreate = async () => {
    await createCompany.mutateAsync({ name, type });
    setName('');
    setType('Company');
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-violet-950">{t('companies.title')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">{t('companies.create')}</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t('companies.create')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t('companies.name')}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg"
                  placeholder={t('companies.name')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('companies.type')}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company">{t('companies.company')}</SelectItem>
                    <SelectItem value="Project">{t('companies.project')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                className="w-full rounded-xl"
                disabled={!name.trim() || createCompany.isPending}
              >
                {createCompany.isPending ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {companies?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">{t('companies.noCompanies')}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies?.map((company) => (
          <Link key={company.id} href={`/companies/${company.id}`}>
            <Card className="rounded-2xl hover:shadow-md transition-shadow border-violet-100 cursor-pointer">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-violet-950">{company.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {company.type === 'Company' ? t('companies.company') : t('companies.project')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg">
                    {company.userRole === 'Owner' ? t('members.owner') : t('members.editor')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{company.partnersCount} {t('companies.partners').toLowerCase()}</span>
                  <span>{new Date(company.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
