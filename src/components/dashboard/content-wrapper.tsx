'use client';

import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebar-store';

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarStore();

  return (
    <div
      className={cn(
        'transition-all duration-300',
        // Mobile: no left offset (sidebar is a drawer overlay)
        // md+: offset by sidebar width (16 = 64px collapsed, 60 = 240px expanded)
        'md:pl-16',
        !collapsed && 'md:pl-60'
      )}
    >
      {children}
    </div>
  );
}
