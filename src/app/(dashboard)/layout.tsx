import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-[#0a0e1a]">
        <Sidebar />
        <div className="pl-60 transition-all duration-300">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
