import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Eye, Database, Key, FileCheck } from 'lucide-react';

const measures = [
  { icon: Shield, title: 'Row-Level Security', description: 'Every database query is filtered by company ID at the database level. No data leaks between tenants.' },
  { icon: Lock, title: 'Encryption at Rest', description: 'All data is encrypted with AES-256. GitHub tokens use additional application-level encryption (AES-256-GCM).' },
  { icon: Eye, title: 'Audit Logging', description: 'Every admin action, configuration change, and data access is logged with full audit trails.' },
  { icon: Database, title: 'SOC 2 Infrastructure', description: 'Built on Supabase and Vercel, both SOC 2 Type II certified platforms.' },
  { icon: Key, title: 'OAuth & SSO', description: 'GitHub OAuth with minimal scopes. Enterprise plans support SAML SSO for corporate identity providers.' },
  { icon: FileCheck, title: 'GDPR Compliant', description: 'Data processing agreements available. Right to deletion and data portability supported.' },
];

export default function SecurityPage() {
  return (
    <div className="px-4 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-display font-bold text-white mb-4">Security & Compliance</h1>
          <p className="text-lg text-[#8892b0] max-w-2xl mx-auto">Enterprise-grade security built into every layer of CodeGuard AI.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {measures.map((m) => (
            <Card key={m.title} className="bg-[#131b2e] border-[#1e2a4a]">
              <CardContent className="p-6">
                <div className="p-2 bg-blue-500/10 rounded-lg w-fit mb-4">
                  <m.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-display font-semibold text-white mb-2">{m.title}</h3>
                <p className="text-sm text-[#8892b0]">{m.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
