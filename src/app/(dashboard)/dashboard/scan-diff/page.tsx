'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useScanCompare, useScanHistory } from '@/hooks/use-scan-compare';
import {
  ArrowRight, ArrowUp, ArrowDown, Minus, GitCommit, FileCode,
  Shield, AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  FilePlus, FileMinus, FileEdit,
} from 'lucide-react';

function DiffBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  if (value === 0) return <span className="text-xs text-gray-400 font-mono flex items-center gap-1"><Minus className="h-3 w-3" /> 0</span>;
  const isPositive = value > 0;
  // For some metrics like debt score, higher is better (inverted)
  const isGood = inverted ? isPositive : !isPositive;
  const color = isGood ? 'text-green-400' : 'text-red-400';
  const Icon = isPositive ? ArrowUp : ArrowDown;
  return (
    <span className={`text-xs font-mono flex items-center gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{value}
    </span>
  );
}

interface ScanEntry {
  id: string;
  repository?: { id: string; name: string; full_name: string };
  scan_type: string;
  commit_sha: string | null;
  completed_at: string;
  total_files: number;
  total_loc: number;
  ai_loc_percentage: number;
  debt_score: number;
  vulnerabilities_total: number;
  quality_grade: string;
}

export default function ScanDiffPage() {
  const [baseId, setBaseId] = useState<string | null>(null);
  const [headId, setHeadId] = useState<string | null>(null);
  const { data: historyData, isLoading: historyLoading } = useScanHistory();
  const { data: compareData, isLoading: comparing } = useScanCompare(baseId, headId);

  const scans: ScanEntry[] = historyData?.data?.scans ?? [];
  const diff = compareData?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Scan Comparison</h1>
        <p className="text-sm text-[#8892b0] mt-1">
          Compare two scans to see what changed — new issues, fixed issues, and trends
        </p>
      </div>

      {/* Scan selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#8892b0]">Base Scan (Before)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {historyLoading ? (
              <Skeleton className="h-10 bg-[#1e2a4a]" />
            ) : (
              <select
                className="w-full bg-[#0a0f1e] border border-[#1e2a4a] rounded-md p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                value={baseId || ''}
                onChange={(e) => setBaseId(e.target.value || null)}
              >
                <option value="">Select base scan...</option>
                {scans.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.repository?.name || 'Unknown'} — {s.commit_sha?.slice(0, 7) || 'N/A'} — {new Date(s.completed_at).toLocaleDateString()} ({s.scan_type})
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#8892b0]">Head Scan (After)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {historyLoading ? (
              <Skeleton className="h-10 bg-[#1e2a4a]" />
            ) : (
              <select
                className="w-full bg-[#0a0f1e] border border-[#1e2a4a] rounded-md p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                value={headId || ''}
                onChange={(e) => setHeadId(e.target.value || null)}
              >
                <option value="">Select head scan...</option>
                {scans.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.repository?.name || 'Unknown'} — {s.commit_sha?.slice(0, 7) || 'N/A'} — {new Date(s.completed_at).toLocaleDateString()} ({s.scan_type})
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {comparing && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 bg-[#131b2e]" />)}
        </div>
      )}

      {/* Comparison results */}
      {diff && !comparing && (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#131b2e] border-[#1e2a4a]">
              <CardContent className="p-4">
                <p className="text-xs text-[#8892b0] mb-1">Debt Score</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono text-white">{diff.base_scan.debt_score}</span>
                    <ArrowRight className="h-4 w-4 text-[#5a6480]" />
                    <span className="text-lg font-mono text-white">{diff.head_scan.debt_score}</span>
                  </div>
                  <DiffBadge value={diff.changes.debt_score_change} inverted />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#131b2e] border-[#1e2a4a]">
              <CardContent className="p-4">
                <p className="text-xs text-[#8892b0] mb-1">Total LOC</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono text-white">{diff.head_scan.total_loc.toLocaleString()}</span>
                  <DiffBadge value={diff.changes.loc_change} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#131b2e] border-[#1e2a4a]">
              <CardContent className="p-4">
                <p className="text-xs text-[#8892b0] mb-1">AI Code %</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono text-white">{diff.base_scan.ai_loc_percentage}%</span>
                    <ArrowRight className="h-4 w-4 text-[#5a6480]" />
                    <span className="text-lg font-mono text-white">{diff.head_scan.ai_loc_percentage}%</span>
                  </div>
                  <DiffBadge value={diff.changes.ai_percentage_change} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#131b2e] border-[#1e2a4a]">
              <CardContent className="p-4">
                <p className="text-xs text-[#8892b0] mb-1">Files</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono text-white">{diff.base_scan.total_files}</span>
                    <ArrowRight className="h-4 w-4 text-[#5a6480]" />
                    <span className="text-lg font-mono text-white">{diff.head_scan.total_files}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vulnerability diff */}
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                Vulnerability Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(['critical', 'high', 'medium', 'low', 'total'] as const).map((sev) => {
                  const baseVal = diff.vulnerabilities.base[sev] ?? 0;
                  const headVal = diff.vulnerabilities.head[sev] ?? 0;
                  const change = diff.vulnerabilities.diff[sev] ?? 0;
                  const colors: Record<string, string> = {
                    critical: 'text-red-400', high: 'text-orange-400',
                    medium: 'text-yellow-400', low: 'text-blue-400', total: 'text-white',
                  };
                  return (
                    <div key={sev} className="text-center">
                      <p className={`text-xs capitalize ${colors[sev]}`}>{sev}</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="font-mono text-white">{baseVal}</span>
                        <ArrowRight className="h-3 w-3 text-[#5a6480]" />
                        <span className="font-mono text-white">{headVal}</span>
                      </div>
                      <div className="mt-1">
                        {change > 0 ? (
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">+{change} new</Badge>
                        ) : change < 0 ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">{change} fixed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-400 border-gray-500/30">No change</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Code quality diff */}
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <FileCode className="h-4 w-4 text-blue-400" />
                Code Quality Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-xs text-[#8892b0]">Worst Grade</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xl font-mono text-white">{diff.code_quality.base_grade}</span>
                    <ArrowRight className="h-4 w-4 text-[#5a6480]" />
                    <span className="text-xl font-mono text-white">{diff.code_quality.head_grade}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#8892b0]">Errors Change</p>
                  <div className="mt-1"><DiffBadge value={diff.code_quality.errors_change} /></div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#8892b0]">Warnings Change</p>
                  <div className="mt-1"><DiffBadge value={diff.code_quality.warnings_change} /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File changes */}
          <Card className="bg-[#131b2e] border-[#1e2a4a]">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-blue-400" />
                File Changes
                <Badge variant="outline" className="text-xs border-[#1e2a4a] text-[#8892b0] ml-2">
                  +{diff.changes.files_added} / ~{diff.changes.files_changed} / -{diff.changes.files_removed}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* New files */}
                {diff.file_diff.new_files.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
                      <FilePlus className="h-3.5 w-3.5" /> New Files ({diff.file_diff.new_files.length})
                    </h4>
                    <div className="space-y-1">
                      {diff.file_diff.new_files.slice(0, 15).map((f: { file_path: string; total_loc: number; ai_probability: number; risk_level: string }) => (
                        <div key={f.file_path} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-green-500/5">
                          <span className="font-mono text-[#8892b0] truncate">{f.file_path}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-green-400">+{f.total_loc} LOC</span>
                            {f.ai_probability > 0.5 && (
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                                {Math.round(f.ai_probability * 100)}% AI
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed files */}
                {diff.file_diff.removed_files.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                      <FileMinus className="h-3.5 w-3.5" /> Removed Files ({diff.file_diff.removed_files.length})
                    </h4>
                    <div className="space-y-1">
                      {diff.file_diff.removed_files.slice(0, 15).map((f: { file_path: string; total_loc: number }) => (
                        <div key={f.file_path} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-red-500/5">
                          <span className="font-mono text-[#8892b0] truncate line-through">{f.file_path}</span>
                          <span className="text-red-400 shrink-0">-{f.total_loc} LOC</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Changed files */}
                {diff.file_diff.changed_files.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1">
                      <FileEdit className="h-3.5 w-3.5" /> Changed Files ({diff.file_diff.changed_files.length})
                    </h4>
                    <div className="space-y-1">
                      {diff.file_diff.changed_files.slice(0, 20).map((f: { file_path: string; loc_change: number; ai_probability_change: number; head: { risk_level: string } }) => (
                        <div key={f.file_path} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-yellow-500/5">
                          <span className="font-mono text-[#8892b0] truncate">{f.file_path}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={f.loc_change > 0 ? 'text-green-400' : f.loc_change < 0 ? 'text-red-400' : 'text-gray-400'}>
                              {f.loc_change > 0 ? '+' : ''}{f.loc_change} LOC
                            </span>
                            {Math.abs(f.ai_probability_change) > 0.05 && (
                              <span className={f.ai_probability_change > 0 ? 'text-purple-400' : 'text-green-400'}>
                                {f.ai_probability_change > 0 ? '+' : ''}{Math.round(f.ai_probability_change * 100)}% AI
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diff.file_diff.new_files.length === 0 && diff.file_diff.removed_files.length === 0 && diff.file_diff.changed_files.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-[#8892b0]">No file-level changes detected between these scans</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!diff && !comparing && baseId && headId && (
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardContent className="p-12 text-center">
            <p className="text-sm text-[#8892b0]">Select two scans above to compare them</p>
          </CardContent>
        </Card>
      )}

      {!baseId && !headId && !historyLoading && scans.length === 0 && (
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardContent className="p-12 text-center">
            <GitCommit className="h-12 w-12 text-[#5a6480] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Completed Scans Yet</h3>
            <p className="text-sm text-[#8892b0]">
              Run at least two scans on a repository to compare changes between them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
