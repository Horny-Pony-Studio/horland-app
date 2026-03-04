'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';

/* ── Tabbar (container) ─────────────────────────── */

interface TabbarProps extends React.HTMLAttributes<HTMLDivElement> {
  icons?: boolean;
  labels?: boolean;
}

const Tabbar = React.forwardRef<HTMLDivElement, TabbarProps>(
  ({ className, icons = false, labels = false, children, ...props }, ref) => {
    const items = React.Children.toArray(children);

    return (
      <div
        ref={ref}
        role="tablist"
        data-icons={icons || undefined}
        data-labels={labels || undefined}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'flex items-center justify-around',
          'bg-white/90 backdrop-blur-md',
          'border-t border-violet-100',
          'pb-[env(safe-area-inset-bottom)]',
          icons && labels ? 'h-16' : 'h-14',
          className,
        )}
        {...props}
      >
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {child}
            {i < items.length - 1 && (
              <div className="w-px h-6 bg-violet-200/60" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  },
);
Tabbar.displayName = 'Tabbar';

/* ── TabbarLink (tab item) ──────────────────────── */

interface TabbarLinkProps {
  active?: boolean;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  href: string;
  className?: string;
}

function TabbarLink({ className, active = false, icon, label, href }: TabbarLinkProps) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5',
        'bg-transparent border-none outline-none no-underline',
        'transition-colors duration-200',
        'text-muted-foreground',
        active && 'text-violet-600',
        className,
      )}
    >
      {icon && <span className="w-7 h-7 flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6">{icon}</span>}
      {label && (
        <span className={cn('leading-tight font-medium', icon ? 'text-[10px]' : 'text-xs')}>
          {label}
        </span>
      )}
    </Link>
  );
}

export { Tabbar, TabbarLink };
export type { TabbarProps, TabbarLinkProps };
