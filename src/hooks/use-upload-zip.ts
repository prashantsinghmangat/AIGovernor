'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UploadZipInput {
  file: File;
  name: string;
  language?: string;
}

interface UploadZipResponse {
  repository_id: string;
  scan_id: string;
  message: string;
  file_count: number;
}

export function useUploadZip() {
  const queryClient = useQueryClient();

  return useMutation<UploadZipResponse, Error, UploadZipInput>({
    mutationFn: async ({ file, name, language }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      if (language) formData.append('language', language);

      const res = await fetch('/api/repositories/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(json.error || `Upload failed (${res.status})`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      toast.success(`Project uploaded — scanning ${data.file_count} files`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
