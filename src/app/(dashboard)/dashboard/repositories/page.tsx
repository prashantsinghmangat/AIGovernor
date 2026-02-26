'use client';

import { RepoRiskCard } from '@/components/dashboard/repo-risk-card';

const repos = [
  { name: 'auth-api', riskZone: 'critical' as const, debtScore: 42, aiLocPercentage: 52, reviewCoverage: 48, lastScan: '2 hours ago' },
  { name: 'frontend', riskZone: 'caution' as const, debtScore: 65, aiLocPercentage: 38, reviewCoverage: 65, lastScan: '2 hours ago' },
  { name: 'payments', riskZone: 'caution' as const, debtScore: 78, aiLocPercentage: 25, reviewCoverage: 80, lastScan: '3 hours ago' },
  { name: 'data-pipeline', riskZone: 'critical' as const, debtScore: 55, aiLocPercentage: 48, reviewCoverage: 40, lastScan: '3 hours ago' },
  { name: 'notifications', riskZone: 'caution' as const, debtScore: 70, aiLocPercentage: 30, reviewCoverage: 70, lastScan: '4 hours ago' },
  { name: 'admin-panel', riskZone: 'critical' as const, debtScore: 35, aiLocPercentage: 62, reviewCoverage: 30, lastScan: '4 hours ago' },
];

export default function RepositoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Repository Risk</h1>
        <p className="text-sm text-[#8892b0] mt-1">AI governance risk overview by repository</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {repos.map((repo) => (
          <RepoRiskCard key={repo.name} {...repo} />
        ))}
      </div>
    </div>
  );
}
