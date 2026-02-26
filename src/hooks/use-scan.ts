'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useTriggerScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      repository_id?: string;
      scan_type: 'full' | 'incremental';
    }) => {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to trigger scan');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      if (variables.repository_id) {
        queryClient.invalidateQueries({ queryKey: ['repository', variables.repository_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useScanStatus(scanId: string | null) {
  return useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}`);
      if (!res.ok) throw new Error('Failed to fetch scan status');
      return res.json();
    },
    enabled: !!scanId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === 'completed' || status === 'failed' ? false : 3000;
    },
  });
}

export interface ScanResultItem {
  id: string;
  file_path: string;
  language: string | null;
  total_loc: number;
  ai_loc: number;
  ai_probability: number;
  risk_level: string;
  detection_signals: Record<string, unknown>;
}

export function useScanResults(scanId: string | null) {
  return useQuery<{ scan_id: string; scan_status: string; results: ScanResultItem[]; total: number }>({
    queryKey: ['scan-results', scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/results`);
      if (!res.ok) throw new Error('Failed to fetch scan results');
      const json = await res.json();
      return json.data;
    },
    enabled: !!scanId,
  });
}
