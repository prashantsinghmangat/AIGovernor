'use client';

import { TeamMemberCard } from '@/components/dashboard/team-member-card';

const members = [
  { name: 'Prashant K.', username: 'prashant-k', aiUsage: 'high' as const, reviewQuality: 'strong' as const, riskIndex: 'low' as const, score: 88, aiPrs: 18, totalPrs: 24 },
  { name: 'Ashish M.', username: 'ashish-m', aiUsage: 'medium' as const, reviewQuality: 'moderate' as const, riskIndex: 'medium' as const, score: 65, aiPrs: 11, totalPrs: 19 },
  { name: 'Shuyeb A.', username: 'shuyeb-a', aiUsage: 'low' as const, reviewQuality: 'strong' as const, riskIndex: 'low' as const, score: 92, aiPrs: 4, totalPrs: 15 },
  { name: 'Attri R.', username: 'attri-r', aiUsage: 'high' as const, reviewQuality: 'weak' as const, riskIndex: 'high' as const, score: 38, aiPrs: 25, totalPrs: 28 },
  { name: 'Neha S.', username: 'neha-s', aiUsage: 'medium' as const, reviewQuality: 'strong' as const, riskIndex: 'low' as const, score: 81, aiPrs: 12, totalPrs: 21 },
  { name: 'Vikram D.', username: 'vikram-d', aiUsage: 'high' as const, reviewQuality: 'moderate' as const, riskIndex: 'medium' as const, score: 59, aiPrs: 26, totalPrs: 31 },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Team Insights</h1>
        <p className="text-sm text-[#8892b0] mt-1">Individual team member AI governance metrics</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <TeamMemberCard key={m.username} {...m} />
        ))}
      </div>
    </div>
  );
}
