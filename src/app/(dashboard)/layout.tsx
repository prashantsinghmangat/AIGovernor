import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ContentWrapper } from '@/components/dashboard/content-wrapper';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-[#0a0e1a]">
        <Sidebar />
        <ContentWrapper>
          <Header />
          <main className="p-4 md:p-6">{children}</main>
        </ContentWrapper>
      </div>
    </TooltipProvider>
  );
}
