'use client';

import Link from 'next/link';
import { Bell, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GovernanceStatus } from './governance-status';
import { useAuth } from '@/hooks/use-auth';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useAlerts } from '@/hooks/use-alerts';

interface HeaderProps {
  score?: number;
}

export function Header({ score = 68 }: HeaderProps) {
  const { signOut } = useAuth();
  const { openMobile } = useSidebarStore();
  const { data: alertsData } = useAlerts('active');
  const alertCount = alertsData?.data?.total ?? 0;

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0f1629] border-b border-[#1e2a4a] flex items-center justify-between px-4 md:px-6 gap-3">
      {/* Left: hamburger (mobile only) */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={openMobile}
          className="md:hidden text-[#8892b0] hover:text-white shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right: governance status + bell + logout */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="hidden lg:block">
          <GovernanceStatus score={score} />
        </div>

        <Link href="/dashboard/alerts">
          <Button variant="ghost" size="icon" className="relative text-[#8892b0] hover:text-white">
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full border-2 border-[#0f1629] flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">{alertCount > 9 ? '9+' : alertCount}</span>
              </span>
            )}
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="text-[#8892b0] hover:text-white"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
