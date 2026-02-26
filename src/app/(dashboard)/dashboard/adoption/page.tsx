'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GaugeChart } from '@/components/dashboard/gauge-chart';
import { TeamMemberCard } from '@/components/dashboard/team-member-card';
import { useTeam } from '@/hooks/use-team';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { UsersIcon } from 'lucide-react';

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

export default function AdoptionPage() {
  const { data: response, isLoading, error } = useTeam();

  const teamData = response?.data as {
    adoption_score: number;
    members: TeamMember[];
  } | undefined;

  const adoptionScore = teamData?.adoption_score ?? 0;
  const members = teamData?.members ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">AI Adoption Health</h1>
        <p className="text-sm text-[#8892b0] mt-1">Monitor team-level AI adoption and governance compliance</p>
      </div>

      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardContent className="py-6 flex items-center justify-center">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <GaugeChart value={adoptionScore} size={200} label="Adoption Score" />
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-display font-semibold text-white mb-4">Team Breakdown</h2>

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
                Team metrics are populated from scan data and pull request activity.
                Run scans on your repositories to start tracking adoption.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
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
        )}
      </div>
    </div>
  );
}
