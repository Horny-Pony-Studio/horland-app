'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePartners, useCreatePartner, useUpdatePartner, useDeletePartner, useUploadPartnerPhoto } from '@/lib/hooks/use-partners';
import { useSearchUsers } from '@/lib/hooks/use-users';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Camera, ChevronsUpDown, Check } from 'lucide-react';
import type { PartnerResponse } from '@/types';

interface PartnersTabProps {
  companyId: string;
  userRole: string;
}

export function PartnersTab({ companyId, userRole }: PartnersTabProps) {
  const t = useTranslations();
  const { data: partners, isLoading } = usePartners(companyId);
  const createPartner = useCreatePartner(companyId);
  const updatePartner = useUpdatePartner(companyId);
  const deletePartner = useDeletePartner(companyId);
  const uploadPhoto = useUploadPartnerPhoto(companyId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [companyShare, setCompanyShare] = useState('');
  const [error, setError] = useState('');

  // User search
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const { data: searchResults } = useSearchUsers(userSearch);

  const canEdit = userRole === 'Owner' || userRole === 'Editor';
  const canDelete = userRole === 'Owner';

  const totalShares = partners?.reduce((sum, p) => sum + p.companyShare, 0) ?? 0;
  const remainingShares = 100 - totalShares;

  // Filter out users who are already partners
  const existingUserIds = new Set(partners?.map(p => p.userId) ?? []);
  const filteredResults = searchResults?.filter(u => !existingUserIds.has(u.id)) ?? [];

  const openCreateDialog = () => {
    setEditingPartner(null);
    setSelectedUserId('');
    setSelectedUserName('');
    setCompanyShare('');
    setUserSearch('');
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (partner: PartnerResponse) => {
    setEditingPartner(partner);
    setSelectedUserId(partner.userId);
    setSelectedUserName(partner.fullName);
    setCompanyShare(partner.companyShare.toString());
    setUserSearch('');
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError('');
    const share = parseFloat(companyShare);

    if (!editingPartner && !selectedUserId) {
      setError(t('partners.selectUser'));
      return;
    }
    if (isNaN(share) || share <= 0 || share > 99) {
      setError('Share must be between 1 and 99');
      return;
    }

    const otherShares = partners
      ?.filter(p => p.id !== editingPartner?.id)
      .reduce((sum, p) => sum + p.companyShare, 0) ?? 0;

    if (otherShares + share > 100) {
      setError(t('partners.sharesExceed'));
      return;
    }

    try {
      if (editingPartner) {
        await updatePartner.mutateAsync({
          partnerId: editingPartner.id,
          data: { companyShare: share },
        });
      } else {
        await createPartner.mutateAsync({ userId: selectedUserId, companyShare: share });
      }
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (partnerId: string) => {
    if (!confirm(t('companies.deleteConfirm'))) return;
    await deletePartner.mutateAsync(partnerId);
  };

  const handlePhotoUpload = async (partnerId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Max file size is 5MB');
      return;
    }
    await uploadPhoto.mutateAsync({ partnerId, file });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <Card className="rounded-2xl border-violet-100">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t('partners.totalShares')}: {totalShares.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">
              {t('partners.remaining')}: {remainingShares.toFixed(1)}%
            </span>
          </div>
          <Progress value={totalShares} className="h-3 rounded-full" />
        </CardContent>
      </Card>

      {/* Add button */}
      {canEdit && (
        <Button onClick={openCreateDialog} className="rounded-xl">{t('partners.add')}</Button>
      )}

      {/* Partners list */}
      {partners?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">{t('partners.noPartners')}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partners?.map((partner) => (
          <Card key={partner.id} className="rounded-2xl border-violet-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="w-14 h-14 rounded-xl">
                    <AvatarImage src={partner.photoUrl || undefined} />
                    <AvatarFallback className="rounded-xl bg-violet-100 text-violet-700 font-semibold">
                      {partner.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {canEdit && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(partner.id, e)}
                      />
                      <Camera className="w-5 h-5 text-white" />
                    </label>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-violet-950 truncate">{partner.fullName}</h3>
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{t('partners.share')}</span>
                      <span className="font-medium text-violet-700">{partner.companyShare}%</span>
                    </div>
                    <Progress value={partner.companyShare} className="h-2 rounded-full" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(partner)} className="rounded-lg text-xs">
                      {t('common.edit')}
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(partner.id)} className="rounded-lg text-xs text-destructive hover:text-destructive">
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPartner ? t('partners.editShares') : t('partners.add')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}

            {/* User selector (only for create) */}
            {!editingPartner ? (
              <div className="space-y-2">
                <Label>{t('partners.selectUser')}</Label>
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userSearchOpen}
                      className="w-full justify-between rounded-lg font-normal"
                    >
                      {selectedUserName || t('partners.searchUsers')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={t('partners.searchUsers')}
                        value={userSearch}
                        onValueChange={setUserSearch}
                      />
                      <CommandList>
                        <CommandEmpty>{t('partners.userNotFound')}</CommandEmpty>
                        <CommandGroup>
                          {filteredResults.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => {
                                setSelectedUserId(user.id);
                                setSelectedUserName(user.fullName);
                                setUserSearchOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${selectedUserId === user.id ? 'opacity-100' : 'opacity-0'}`}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm">{user.fullName}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t('partners.fullName')}</Label>
                <div className="px-3 py-2 rounded-lg bg-muted text-sm">{editingPartner.fullName}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('partners.share')}</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                max="99"
                value={companyShare}
                onChange={(e) => setCompanyShare(e.target.value)}
                className="rounded-lg"
                placeholder="e.g. 25.00"
              />
              <p className="text-xs text-muted-foreground">
                {t('partners.remaining')}: {(remainingShares + (editingPartner?.companyShare ?? 0)).toFixed(1)}%
              </p>
            </div>
            <Button
              onClick={handleSave}
              className="w-full rounded-xl"
              disabled={createPartner.isPending || updatePartner.isPending}
            >
              {(createPartner.isPending || updatePartner.isPending) ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
