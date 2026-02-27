'use client';

import { useState } from 'react';
import { useRepositories } from '@/hooks/use-repositories';
import { useGitHubStatus } from '@/hooks/use-github-status';
import { RepoRiskCard } from '@/components/dashboard/repo-risk-card';
import { GitHubStatusBanner } from '@/components/dashboard/github-status-banner';
import { AddReposDialog } from '@/components/dashboard/add-repos-dialog';
import { UnlinkRepoDialog } from '@/components/dashboard/unlink-repo-dialog';
import { UploadZipDialog } from '@/components/dashboard/upload-zip-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, GitBranch, Upload } from 'lucide-react';

interface EnrichedRepo {
  id: string;
  name: string;
  full_name: string;
  github_id: number | null;
  language: string | null;
  default_branch: string;
  is_private: boolean;
  source?: string;
  debt_score: number | null;
  risk_zone: string | null;
  last_scan_at: string | null;
  latest_scan_at: string | null;
}

export default function RepositoriesPage() {
  const { data, isLoading } = useRepositories();
  const { data: githubStatus } = useGitHubStatus();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<{ id: string; full_name: string } | null>(null);

  const repositories: EnrichedRepo[] = data?.repositories ?? [];
  const existingGithubIds = repositories.filter((r) => r.github_id != null).map((r) => r.github_id as number);

  const handleUnlink = (id: string, fullName: string) => {
    setUnlinkTarget({ id, full_name: fullName });
  };

  return (
    <div className="space-y-6">
      {/* GitHub connection status */}
      <GitHubStatusBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Repository Risk</h1>
          <p className="text-sm text-[#8892b0] mt-1">
            {repositories.length > 0
              ? `${repositories.length} ${repositories.length === 1 ? 'repository' : 'repositories'} monitored`
              : 'AI governance risk overview by repository'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setUploadDialogOpen(true)} size="sm" variant="outline" className="gap-2 border-[#1e2a4a]">
            <Upload className="h-4 w-4" />
            Upload ZIP
          </Button>
          {githubStatus?.connected && (
            <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Repositories
            </Button>
          )}
        </div>
      </div>

      {/* Repository grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : repositories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#1e2a4a] bg-[#131b2e]/50 py-16">
          <GitBranch className="h-12 w-12 text-[#5a6480] mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No repositories connected</h3>
          <p className="text-sm text-[#8892b0] mb-6 text-center max-w-md">
            {githubStatus?.connected
              ? 'Add repositories from your GitHub account or upload a ZIP file to start scanning.'
              : 'Connect your GitHub account or upload a ZIP file to start scanning your code.'}
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => setUploadDialogOpen(true)} variant="outline" className="gap-2 border-[#1e2a4a]">
              <Upload className="h-4 w-4" />
              Upload ZIP
            </Button>
            {githubStatus?.connected && (
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Repositories
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repositories.map((repo) => (
            <RepoRiskCard
              key={repo.id}
              id={repo.id}
              name={repo.name}
              fullName={repo.full_name}
              language={repo.language}
              defaultBranch={repo.default_branch}
              isPrivate={repo.is_private}
              riskZone={repo.risk_zone}
              debtScore={repo.debt_score}
              lastScanAt={repo.latest_scan_at ?? repo.last_scan_at}
              onUnlink={handleUnlink}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddReposDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        existingGithubIds={existingGithubIds}
      />
      <UnlinkRepoDialog
        open={!!unlinkTarget}
        onOpenChange={(open) => { if (!open) setUnlinkTarget(null); }}
        repository={unlinkTarget}
      />
      <UploadZipDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  );
}
