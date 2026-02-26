'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, Lock, Loader2 } from 'lucide-react';
import { useGitHubRepos } from '@/hooks/use-github-repos';
import { useAddRepositories } from '@/hooks/use-add-repositories';
import { toast } from 'sonner';
import type { GitHubRepoItem } from '@/types/api';

interface AddReposDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGithubIds: number[];
}

export function AddReposDialog({ open, onOpenChange, existingGithubIds }: AddReposDialogProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data, isLoading } = useGitHubRepos(open);
  const { mutate: addRepos, isPending } = useAddRepositories();

  const availableRepos = (data?.repos || []).filter(
    (repo) => !existingGithubIds.includes(repo.github_id)
  );

  const toggleRepo = (githubId: number) => {
    setSelectedIds((prev) =>
      prev.includes(githubId)
        ? prev.filter((id) => id !== githubId)
        : [...prev, githubId]
    );
  };

  const handleAdd = () => {
    const reposToAdd: GitHubRepoItem[] = availableRepos.filter((r) =>
      selectedIds.includes(r.github_id)
    );

    addRepos(reposToAdd, {
      onSuccess: (res) => {
        toast.success(`Added ${res.data?.added ?? reposToAdd.length} repositories`);
        setSelectedIds([]);
        onOpenChange(false);
      },
      onError: () => {
        toast.error('Failed to add repositories');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-[#1e2a4a] bg-[#131b2e]">
        <DialogHeader>
          <DialogTitle className="text-white">Add Repositories</DialogTitle>
          <DialogDescription className="text-[#8892b0]">
            Select repositories from your GitHub account to monitor.
            {data?.github_username && (
              <span className="ml-1 text-[#5a6480]">(@{data.github_username})</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-1 overflow-y-auto py-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))
          ) : availableRepos.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#5a6480]">
              All your GitHub repositories are already added.
            </p>
          ) : (
            availableRepos.map((repo) => (
              <label
                key={repo.github_id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-[#1e2a4a]/50"
              >
                <Checkbox
                  checked={selectedIds.includes(repo.github_id)}
                  onCheckedChange={() => toggleRepo(repo.github_id)}
                />
                <GitBranch className="h-4 w-4 shrink-0 text-[#5a6480]" />
                <span className="flex-1 truncate font-mono text-sm text-white">
                  {repo.full_name}
                </span>
                <div className="flex items-center gap-2">
                  {repo.language && (
                    <Badge variant="outline" className="border-[#1e2a4a] text-[10px] text-[#8892b0]">
                      {repo.language}
                    </Badge>
                  )}
                  {repo.is_private && (
                    <Lock className="h-3 w-3 text-[#5a6480]" />
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter className="border-t border-[#1e2a4a] pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#1e2a4a]">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedIds.length === 0 || isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Add {selectedIds.length > 0 ? `${selectedIds.length} ` : ''}
            {selectedIds.length === 1 ? 'Repository' : 'Repositories'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
