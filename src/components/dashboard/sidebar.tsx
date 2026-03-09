'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Activity, Users, FileText, GitBranch, GitPullRequest, GitCompare,
  Bell, Layers, Settings, Shield, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useAlerts } from '@/hooks/use-alerts';

const iconMap: Record<string, React.ElementType> = {
  Home, Activity, Users, FileText, GitBranch, GitPullRequest, GitCompare,
  Bell, Layers, Settings, Shield,
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: 'alerts';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: '',
    items: [
      { href: '/dashboard', label: 'Overview', icon: 'Home' },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { href: '/dashboard/repositories', label: 'Repositories', icon: 'GitBranch' },
      { href: '/dashboard/pull-requests', label: 'PR Analysis', icon: 'GitPullRequest' },
      { href: '/dashboard/ai-debt', label: 'AI Debt', icon: 'Activity' },
      { href: '/dashboard/team', label: 'Team & Adoption', icon: 'Users' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { href: '/dashboard/scan-diff', label: 'Scan Comparison', icon: 'GitCompare' },
      { href: '/dashboard/reports', label: 'Reports', icon: 'FileText' },
      { href: '/dashboard/alerts', label: 'Alerts', icon: 'Bell', badge: 'alerts' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/dashboard/integrations', label: 'Integrations', icon: 'Layers' },
      { href: '/dashboard/settings', label: 'Settings', icon: 'Settings' },
    ],
  },
];

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: alertsData } = useAlerts('active');
  const alertCount = alertsData?.data?.total ?? 0;

  return (
    <nav className="flex-1 py-2 overflow-y-auto">
      {sections.map((section, sectionIdx) => (
        <div key={section.title || sectionIdx} className={cn(sectionIdx > 0 && 'mt-2')}>
          {section.title && !collapsed && (
            <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5a6480]">
              {section.title}
            </p>
          )}
          {section.title && collapsed && (
            <div className="mx-3 my-2 border-t border-[#1e2a4a]" />
          )}

          {section.items.map((link) => {
            const Icon = iconMap[link.icon] || Home;
            const isActive = pathname === link.href ||
              (link.href !== '/dashboard' && pathname.startsWith(link.href));

            const content = (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-all',
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
                    {link.badge === 'alerts' && alertCount > 0 && (
                      <Badge className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center">
                        {alertCount > 99 ? '99+' : alertCount}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <div key={link.href} className="relative">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="right" className="bg-[#131b2e] border-[#1e2a4a] text-white">
                      {link.label}
                      {link.badge === 'alerts' && alertCount > 0 && ` (${alertCount})`}
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            }

            return content;
          })}
        </div>
      ))}
    </nav>
  );
}

function DesktopSidebar() {
  const { collapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        'hidden md:flex fixed left-0 top-0 h-screen bg-[#0f1629] border-r border-[#1e2a4a] flex-col transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className={cn('flex items-center h-16 px-4 border-b border-[#1e2a4a] shrink-0', collapsed && 'justify-center')}>
        {collapsed ? <Shield className="h-6 w-6 text-blue-500" /> : <Logo />}
      </div>

      <NavLinks collapsed={collapsed} />

      <div className="border-t border-[#1e2a4a] p-3 shrink-0">
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

function MobileSidebar() {
  const { mobileOpen, closeMobile } = useSidebarStore();

  return (
    <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) closeMobile(); }}>
      <SheetContent
        side="left"
        className="w-72 p-0 bg-[#0f1629] border-r border-[#1e2a4a] flex flex-col"
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#1e2a4a] shrink-0">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobile}
            className="text-[#5a6480] hover:text-white h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <NavLinks collapsed={false} onNavigate={closeMobile} />
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
