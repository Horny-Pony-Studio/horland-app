'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchUsers } from '@/lib/hooks/use-users';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import type { UserSearchResult } from '@/types';

interface UserComboboxProps {
  value: string | null;
  onSelect: (user: UserSearchResult) => void;
  excludeUserIds?: string[];
}

export function UserCombobox({ value, onSelect, excludeUserIds = [] }: UserComboboxProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: users, isLoading } = useSearchUsers(search);

  const filteredUsers = users?.filter(u => !excludeUserIds.includes(u.id)) ?? [];

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      setSearch('');
    }
  }, [value]);

  const handleSelect = (user: UserSearchResult) => {
    setSelectedLabel(user.fullName);
    setSearch('');
    setOpen(false);
    onSelect(user);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={open ? search : selectedLabel}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t('partners.searchUsers')}
            className="rounded-lg pr-8"
          />
          <ChevronsUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="max-h-60 overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && search.length >= 2 && filteredUsers.length === 0 && (
          <div className="py-3 px-3 text-sm text-muted-foreground text-center">
            {t('partners.userNotFound')}
          </div>
        )}
        {!isLoading && search.length < 2 && (
          <div className="py-3 px-3 text-sm text-muted-foreground text-center">
            {t('partners.searchUsers')}
          </div>
        )}
        {filteredUsers.map((user) => (
          <button
            key={user.id}
            type="button"
            className="flex items-center w-full gap-2 px-3 py-2 text-sm hover:bg-accent rounded-sm cursor-pointer text-left"
            onClick={() => handleSelect(user)}
          >
            <Check className={`h-4 w-4 shrink-0 ${value === user.id ? 'opacity-100' : 'opacity-0'}`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
