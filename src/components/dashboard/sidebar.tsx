'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Activity, Users, FileText, GitBranch, DollarSign,
  Bell, Brain, Layers, CreditCard, Settings, Shield, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebarStore } from '@/stores/sidebar-store';

const iconMap: Record<string, React.ElementType> = {
  Home, Activity, Users, FileText, GitBranch, DollarSign,
  Bell, Brain, Layers, CreditCard, Settings, Shield,
};

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: 'Home' },
  { href: '/dashboard/ai-debt', label: 'AI Debt Analysis', icon: 'Activity' },
  { href: '/dashboard/adoption', label: 'Adoption Health', icon: 'Users' },
  { href: '/dashboard/reports', label: 'Governance Reports', icon: 'FileText' },
  { href: '/dashboard/repositories', label: 'Repository Risk', icon: 'GitBranch' },
  { href: '/dashboard/team', label: 'Team Insights', icon: 'Users' },
  { href: '/dashboard/roi', label: 'ROI Calculator', icon: 'DollarSign' },
  { href: '/dashboard/alerts', label: 'Alerts', icon: 'Bell', badge: true },
  { href: '/dashboard/prompt-governance', label: 'Prompt Governance', icon: 'Brain' },
  { href: '/dashboard/integrations', label: 'Integrations', icon: 'Layers' },
  { href: '/dashboard/billing', label: 'Billing', icon: 'CreditCard' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'Settings' },
  { href: '/dashboard/admin', label: 'Admin Panel', icon: 'Shield' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-[#0f1629] border-r border-[#1e2a4a] flex flex-col transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center h-16 px-4 border-b border-[#1e2a4a]', collapsed && 'justify-center')}>
        {collapsed ? (
          <Shield className="h-6 w-6 text-blue-500" />
        ) : (
          <Logo />
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {links.map((link) => {
          const Icon = iconMap[link.icon] || Home;
          const isActive = pathname === link.href;

          const content = (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-blue-500/10 text-blue-400 font-medium'
                  : 'text-[#8892b0] hover:text-white hover:bg-[#182040]',
                collapsed && 'justify-center px-0 mx-1'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{link.label}</span>
                  {link.badge && (
                    <Badge className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0 h-4">
                      6
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={link.href} delayDuration={0}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right" className="bg-[#131b2e] border-[#1e2a4a] text-white">
                  {link.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return content;
        })}
      </nav>

      <div className="border-t border-[#1e2a4a] p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="w-full text-[#5a6480] hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
