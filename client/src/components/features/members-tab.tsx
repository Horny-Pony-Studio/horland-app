'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMembers, useAddMember, useToggleEditor, useRemoveMember } from '@/lib/hooks/use-members';
import { useSearchUsers } from '@/lib/hooks/use-users';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';

interface MembersTabProps {
  companyId: string;
  userRole: string;
}

export function MembersTab({ companyId, userRole }: MembersTabProps) {
  const t = useTranslations();
  const { data: members, isLoading } = useMembers(companyId);
  const addMember = useAddMember(companyId);
  const toggleEditor = useToggleEditor(companyId);
  const removeMember = useRemoveMember(companyId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const { data: searchResults } = useSearchUsers(userSearch);

  const isOwner = userRole === 'Owner';

  const existingUserIds = new Set(members?.map(m => m.userId) ?? []);
  const filteredResults = searchResults?.filter(u => !existingUserIds.has(u.id)) ?? [];

  const openInviteDialog = () => {
    setSelectedEmail('');
    setSelectedName('');
    setUserSearch('');
    setError('');
    setDialogOpen(true);
  };

  const handleInvite = async () => {
    setError('');
    if (!selectedEmail) {
      setError(t('members.selectUser'));
      return;
    }
    try {
      await addMember.mutateAsync({ email: selectedEmail, role: 'Editor' });
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm(t('members.removeConfirm'))) return;
    await removeMember.mutateAsync(memberId);
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
      {isOwner && (
        <Button onClick={openInviteDialog} className="rounded-xl">
          {t('members.add')}
        </Button>
      )}

      <div className="space-y-3">
        {members?.map((member) => (
          <Card key={member.id} className="rounded-2xl border-violet-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-violet-950 truncate">{member.fullName}</h3>
                    <Badge
                      variant={member.role === 'Owner' ? 'default' : 'secondary'}
                      className="rounded-lg text-xs"
                    >
                      {member.role === 'Owner'
                        ? t('members.owner')
                        : member.role === 'Editor'
                          ? t('members.editor')
                          : t('members.viewer')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                </div>
                {isOwner && member.role !== 'Owner' && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`editor-${member.id}`} className="text-xs text-muted-foreground">
                        {t('members.editor')}
                      </Label>
                      <Switch
                        id={`editor-${member.id}`}
                        checked={member.role === 'Editor'}
                        onCheckedChange={() => toggleEditor.mutate(member.id)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-xs text-destructive hover:text-destructive"
                      onClick={() => handleRemove(member.id)}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('members.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div className="space-y-2">
              <Label>{t('members.selectUser')}</Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className="w-full justify-between rounded-lg font-normal"
                  >
                    {selectedName || t('partners.searchUsers')}
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
                              setSelectedEmail(user.email);
                              setSelectedName(user.fullName);
                              setUserSearchOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${selectedEmail === user.email ? 'opacity-100' : 'opacity-0'}`}
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
            <p className="text-xs text-muted-foreground">{t('members.willBeEditor')}</p>
            <Button
              onClick={handleInvite}
              className="w-full rounded-xl"
              disabled={addMember.isPending}
            >
              {addMember.isPending ? t('common.loading') : t('members.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
