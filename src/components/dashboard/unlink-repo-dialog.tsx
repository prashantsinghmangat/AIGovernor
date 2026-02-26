'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useUnlinkRepository } from '@/hooks/use-unlink-repository';
import { toast } from 'sonner';

interface UnlinkRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repository: { id: string; full_name: string } | null;
}

export function UnlinkRepoDialog({ open, onOpenChange, repository }: UnlinkRepoDialogProps) {
  const { mutate: unlink, isPending } = useUnlinkRepository();

  const handleUnlink = () => {
    if (!repository) return;

    unlink(repository.id, {
      onSuccess: () => {
        toast.success(`Unlinked ${repository.full_name}`);
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to unlink repository');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[#1e2a4a] bg-[#131b2e]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-white">Unlink Repository</DialogTitle>
              <DialogDescription className="text-[#8892b0]">
                This action cannot be easily undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-[#1e2a4a] bg-[#0a0e1a] p-4">
          <p className="text-sm text-[#8892b0]">
            Are you sure you want to unlink{' '}
            <span className="font-mono font-semibold text-white">{repository?.full_name}</span>?
          </p>
          <p className="mt-2 text-xs text-[#5a6480]">
            This will deactivate the repository and stop all scanning. Historical scan data and scores will be preserved for audit purposes.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-[#1e2a4a]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleUnlink}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Unlink Repository
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
