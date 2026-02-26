'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCard } from '@/components/dashboard/alert-card';

const allAlerts = [
  { id: '1', severity: 'high' as const, title: 'High AI-generated code in auth module', description: 'Auth API has 52% AI-generated LOC with only 48% review coverage.', time: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', severity: 'high' as const, title: 'Low human review coverage in backend PRs', description: '39% of AI-generated PRs merged without review this week.', time: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', severity: 'medium' as const, title: 'Spike in AI refactor suggestions ignored', description: '12 AI-suggested refactors dismissed without review.', time: new Date(Date.now() - 14400000).toISOString() },
  { id: '4', severity: 'medium' as const, title: 'Prompt inconsistency detected in Frontend repo', description: 'Multiple AI prompting patterns found.', time: new Date(Date.now() - 28800000).toISOString() },
  { id: '5', severity: 'low' as const, title: 'New team member AI governance onboarding pending', description: 'Vikram D. has not completed onboarding.', time: new Date(Date.now() - 86400000).toISOString() },
  { id: '6', severity: 'high' as const, title: 'Admin Panel repo exceeds AI debt threshold', description: 'Score dropped to 35 (critical zone).', time: new Date(Date.now() - 172800000).toISOString() },
];

export default function AlertsPage() {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dismissed, setDismissed] = useState<string[]>([]);

  const filtered = allAlerts
    .filter(a => !dismissed.includes(a.id))
    .filter(a => filter === 'all' || a.severity === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Alerts & Notifications</h1>
        <p className="text-sm text-[#8892b0] mt-1">Active governance alerts and risk notifications</p>
      </div>
      <div className="flex gap-2">
        {(['all', 'high', 'medium', 'low'] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className={filter === s ? 'bg-blue-600 text-white' : 'border-[#1e2a4a] text-[#8892b0]'}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((alert) => (
          <AlertCard key={alert.id} {...alert} onDismiss={(id) => setDismissed(prev => [...prev, id])} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-[#5a6480] py-12">No alerts to show</p>
        )}
      </div>
    </div>
  );
}
