'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useReportDownload() {
  const [downloading, setDownloading] = useState(false);

  const downloadFullReport = useCallback(async (companyName?: string) => {
    if (downloading) return;
    setDownloading(true);

    try {
      toast.loading('Generating PDF report…', { id: 'pdf-gen' });

      // 1. Fetch all report data from the API
      const res = await fetch('/api/reports/data');
      if (!res.ok) throw new Error('Failed to fetch report data');
      const { data } = await res.json();

      // 2. Dynamically import the generator (avoids SSR issues with jsPDF)
      const { generatePdfReport } = await import('@/lib/pdf/generator');

      // 3. Generate and download
      const filename = `codeguard-${(companyName ?? data.company_name ?? 'report').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      await generatePdfReport(data, filename);

      toast.success('Report downloaded!', { id: 'pdf-gen' });
    } catch (err) {
      console.error('[PDF Report]', err);
      toast.error('Failed to generate report', { id: 'pdf-gen', description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  const downloadRepoReport = useCallback(async (repoId: string, repoName: string) => {
    if (downloading) return;
    setDownloading(true);

    try {
      toast.loading(`Generating report for ${repoName}…`, { id: 'pdf-gen' });

      // Fetch company-level data (contains per-repo data)
      const res = await fetch('/api/reports/data');
      if (!res.ok) throw new Error('Failed to fetch report data');
      const { data } = await res.json();

      // Filter to just this repo
      const repoData = {
        ...data,
        repositories: data.repositories.filter((r: { id: string }) => r.id === repoId),
        alerts: data.alerts.filter((a: { repo_name: string }) => a.repo_name === repoName),
      };

      const { generatePdfReport } = await import('@/lib/pdf/generator');
      const filename = `codeguard-${repoName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      generatePdfReport(repoData, filename);

      toast.success('Report downloaded!', { id: 'pdf-gen' });
    } catch (err) {
      console.error('[PDF Report]', err);
      toast.error('Failed to generate report', { id: 'pdf-gen' });
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  return { downloading, downloadFullReport, downloadRepoReport };
}
