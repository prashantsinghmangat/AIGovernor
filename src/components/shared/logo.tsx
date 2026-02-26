import { Shield } from 'lucide-react';

export function Logo({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizes = { sm: 'h-5 w-5', default: 'h-6 w-6', lg: 'h-8 w-8' };
  const textSizes = { sm: 'text-sm', default: 'text-lg', lg: 'text-xl' };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Shield className={`${sizes[size]} text-blue-500`} />
        <div className="absolute inset-0 blur-sm bg-blue-500/30 rounded-full" />
      </div>
      <span className={`font-display font-bold text-white ${textSizes[size]}`}>
        CodeGuard <span className="text-blue-400">AI</span>
      </span>
    </div>
  );
}
