'use client';

import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GovernanceStatus } from './governance-status';
import { useAuth } from '@/hooks/use-auth';
import { useSidebarStore } from '@/stores/sidebar-store';

interface HeaderProps {
  score?: number;
}

export function Header({ score = 68 }: HeaderProps) {
  const { signOut } = useAuth();
  const { openMobile } = useSidebarStore();

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0f1629] border-b border-[#1e2a4a] flex items-center justify-between px-4 md:px-6 gap-3">
      {/* Left: hamburger (mobile only) + search */}
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

        {/* Search — hidden on xs, visible from sm */}
        <div className="relative w-full max-w-xs hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6480]" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-[#0a0e1a] border-[#1e2a4a] text-white placeholder:text-[#5a6480] h-9"
          />
        </div>
      </div>

      {/* Right: governance status + bell + logout */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="hidden lg:block">
          <GovernanceStatus score={score} />
        </div>

        <Button variant="ghost" size="icon" className="relative text-[#8892b0] hover:text-white">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border-2 border-[#0f1629]" />
        </Button>

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
