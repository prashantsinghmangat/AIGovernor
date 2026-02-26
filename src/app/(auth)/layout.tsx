import { Logo } from '@/components/shared/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      {children}
    </div>
  );
}
