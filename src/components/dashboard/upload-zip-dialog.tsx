'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileArchive, Loader2, X } from 'lucide-react';
import { useUploadZip } from '@/hooks/use-upload-zip';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface UploadZipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
}

export function UploadZipDialog({ open, onOpenChange, defaultName }: UploadZipDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(defaultName || '');
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: upload, isPending, data: result } = useUploadZip();

  const reset = useCallback(() => {
    setFile(null);
    setName(defaultName || '');
    setDragOver(false);
    setFileError(null);
  }, [defaultName]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const validateFile = (f: File): boolean => {
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setFileError('Please select a .zip file');
      return false;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setFileError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_SIZE_MB}MB.`);
      return false;
    }
    if (f.size === 0) {
      setFileError('File is empty');
      return false;
    }
    setFileError(null);
    return true;
  };

  const handleFileSelect = (f: File) => {
    if (validateFile(f)) {
      setFile(f);
      // Auto-populate name from filename (strip .zip extension and common suffixes)
      if (!name) {
        const baseName = f.name
          .replace(/\.zip$/i, '')
          .replace(/-main$|-master$/, '');
        setName(baseName);
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleSubmit = () => {
    if (!file || !name.trim()) return;
    upload(
      { file, name: name.trim() },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  const sizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : '0';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border-[#1e2a4a] bg-[#131b2e]">
        <DialogHeader>
          <DialogTitle className="text-white">Upload Project ZIP</DialogTitle>
          <DialogDescription className="text-[#8892b0]">
            Upload a ZIP file of your project to scan for vulnerabilities,
            code quality issues, and enhancement opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-500/10'
                : file
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-[#1e2a4a] hover:border-[#5a6480] hover:bg-[#1e2a4a]/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />

            {file ? (
              <>
                <FileArchive className="h-8 w-8 text-green-400" />
                <div className="text-center">
                  <p className="font-mono text-sm text-white">{file.name}</p>
                  <p className="text-xs text-[#5a6480]">{sizeMB} MB</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#5a6480] hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setFileError(null);
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-[#5a6480]" />
                <div className="text-center">
                  <p className="text-sm text-white">
                    Drop your ZIP file here or <span className="text-blue-400">browse</span>
                  </p>
                  <p className="text-xs text-[#5a6480]">Max {MAX_SIZE_MB}MB</p>
                </div>
              </>
            )}
          </div>

          {fileError && (
            <p className="text-sm text-red-400">{fileError}</p>
          )}

          {/* Project name */}
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-[#8892b0]">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              maxLength={200}
              className="border-[#1e2a4a] bg-[#0d1321] text-white placeholder:text-[#5a6480]"
            />
          </div>

          {/* Upload progress */}
          {isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#8892b0]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading and processing...
              </div>
              <Progress value={30} className="h-1.5" />
            </div>
          )}

          {result && !isPending && (
            <p className="text-sm text-green-400">
              Upload complete — {result.file_count} files queued for scanning.
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-[#1e2a4a] pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-[#1e2a4a]"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || !name.trim() || isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload & Scan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
