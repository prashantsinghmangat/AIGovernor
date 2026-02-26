'use client';

import { useGitHubStatus } from '@/hooks/use-github-status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, Github } from 'lucide-react';

export function GitHubStatusBanner() {
  const { data, isLoading } = useGitHubStatus();

  if (isLoading) {
    return <Skeleton className="h-14 w-full rounded-lg" />;
  }

  if (!data) return null;

  if (data.connected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-sm text-green-300">
            Connected as <span className="font-semibold text-green-200">@{data.github_username}</span>
          </span>
        </div>
        <Github className="h-5 w-5 text-green-400/60" />
      </div>
    );
  }

  const handleConnect = async () => {
    const res = await fetch('/api/auth/github/connect');
    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400" />
        <span className="text-sm text-amber-300">
          GitHub not connected. Connect your account to manage repositories.
        </span>
      </div>
      <Button size="sm" onClick={handleConnect} className="gap-2">
        <Github className="h-4 w-4" />
        Connect GitHub
      </Button>
    </div>
  );
}
