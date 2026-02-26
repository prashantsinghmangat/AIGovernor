import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { Separator } from '@/components/ui/separator';

const footerLinks = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/security', label: 'Security' },
  { href: '/governance-guide', label: 'Guide' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center gap-6">
          <Logo />
          <div className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          <Separator className="bg-border" />
          <p className="text-xs text-muted-foreground">&copy; 2026 CodeGuard AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
