'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GaugeChart } from '@/components/dashboard/gauge-chart';
import { TeamMemberCard } from '@/components/dashboard/team-member-card';
import { MetricCard } from '@/components/dashboard/metric-card';
import { useTeam } from '@/hooks/use-team';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { UsersIcon, Bot, Shield, TrendingUp } from 'lucide-react';

interface TeamMember {
  github_username: string;
  display_name: string;
  avatar_url: string | null;
  ai_usage_level: 'high' | 'medium' | 'low';
  review_quality: 'strong' | 'moderate' | 'weak';
  risk_index: 'high' | 'medium' | 'low';
  governance_score: number;
  total_prs: number;
  ai_prs: number;
  prs_reviewed: number;
  coaching_suggestions: unknown[];
}

export default function TeamPage() {
  const { data: response, isLoading, error } = useTeam();
  const [showAll, setShowAll] = useState(false);

  const teamData = response?.data as {
    adoption_score: number;
    members: TeamMember[];
  } | undefined;

  const members = teamData?.members ?? [];
  const adoptionScore = teamData?.adoption_score ?? 0;

  const highAiUsers = members.filter((m) => m.ai_usage_level === 'high').length;
  const avgGovernance = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + m.governance_score, 0) / members.length)
    : 0;

  const visibleMembers = showAll ? members : members.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Team Insights</h1>
        <p className="text-sm text-[#8892b0] mt-1">Team adoption, AI usage, and individual governance metrics</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardContent className="py-12 text-center">
            <p className="text-red-400 text-sm">Failed to load team data. Please try again.</p>
          </CardContent>
        </Card>
      ) : members.length === 0 ? (
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardContent className="py-12 text-center">
            <UsersIcon className="h-10 w-10 text-[#5a6480] mx-auto mb-3" />
            <p className="text-[#8892b0] text-sm font-medium">No team members found</p>
            <p className="text-[#5a6480] text-xs mt-1">
              Team members are automatically discovered from Git commit history when repositories are scanned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Adoption overview */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="bg-[#131b2e] border-[#1e2a4a] flex items-center justify-center p-4">
              <GaugeChart value={adoptionScore} size={140} label="Adoption Score" />
            </Card>
            <MetricCard
              icon={UsersIcon}
              label="Team Size"
              value={String(members.length)}
              subtitle="from Git commits"
            />
            <MetricCard
              icon={Bot}
              label="High AI Users"
              value={String(highAiUsers)}
              subtitle={members.length > 0 ? `${Math.round((highAiUsers / members.length) * 100)}% of team` : undefined}
            />
            <MetricCard
              icon={Shield}
              label="Avg Governance"
              value={`${avgGovernance}/100`}
              changeType={avgGovernance >= 70 ? 'up' : avgGovernance >= 50 ? 'neutral' : 'down'}
            />
          </div>

          {/* Team members */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleMembers.map((m) => (
              <TeamMemberCard
                key={m.github_username}
                name={m.display_name}
                username={m.github_username}
                aiUsage={m.ai_usage_level}
                reviewQuality={m.review_quality}
                riskIndex={m.risk_index}
                score={m.governance_score}
                aiPrs={m.ai_prs}
                totalPrs={m.total_prs}
              />
            ))}
          </div>

          {members.length > 6 && (
            <div className="text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showAll ? 'Show less' : `Show all ${members.length} members`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
