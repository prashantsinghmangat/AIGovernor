'use client';

import { Search, Bell, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GovernanceStatus } from './governance-status';
import { useAuth } from '@/hooks/use-auth';

interface HeaderProps {
  score?: number;
}

export function Header({ score = 68 }: HeaderProps) {
  const { signOut } = useAuth();

  return (
    <header className="h-16 bg-[#0f1629] border-b border-[#1e2a4a] flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6480]" />
          <Input
            placeholder="Search governance data..."
            className="pl-10 bg-[#0a0e1a] border-[#1e2a4a] text-white placeholder:text-[#5a6480] h-9"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <GovernanceStatus score={score} />
        <Button variant="ghost" size="icon" className="relative text-[#8892b0] hover:text-white">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border-2 border-[#0f1629]" />
        </Button>
        <Button variant="ghost" size="icon" onClick={signOut} className="text-[#8892b0] hover:text-white">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
