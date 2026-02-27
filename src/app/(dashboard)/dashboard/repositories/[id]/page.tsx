"use client"

import { Fragment, useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  ScanIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FileCodeIcon,
  ShieldAlertIcon,
  ExternalLinkIcon,
  Loader2,
  GitBranch,
  Lock,
  Globe,
  Info,
  XCircle,
  ChevronRight,
  ChevronDown,
  Eye,
  Github,
  PackageIcon,
  FileArchive,
  Upload,
} from "lucide-react"
import { useRepository } from "@/hooks/use-repository"
import { useGitHubStatus } from "@/hooks/use-github-status"
import { useTriggerScan, useScanStatus, useScanResults } from "@/hooks/use-scan"
import { UploadZipDialog } from "@/components/dashboard/upload-zip-dialog"
import { toast } from "sonner"
import { GaugeChart } from "@/components/dashboard/gauge-chart"
import { ScoreTrendChart } from "@/components/charts/score-trend-chart"
import { formatRelativeTime, formatDate } from "@/lib/utils/format"

const STYLE_SIGNAL_LABELS: Record<string, { label: string; description: string; weight: number }> = {
  naming_verbosity: {
    label: "Naming Verbosity",
    description: "Long, descriptive variable and function names typical of AI-generated code",
    weight: 20,
  },
  comment_uniformity: {
    label: "Comment Uniformity",
    description: "Consistent comment formatting and capitalization patterns",
    weight: 15,
  },
  typo_absence: {
    label: "Typo Absence",
    description: "No human markers like TODO, FIXME, or typos in comments/strings",
    weight: 10,
  },
  indent_consistency: {
    label: "Indent Consistency",
    description: "Perfect, uniform indentation throughout the file",
    weight: 10,
  },
  error_handling_ratio: {
    label: "Error Handling",
    description: "Comprehensive try/catch coverage and error boundary patterns",
    weight: 15,
  },
  boilerplate_ratio: {
    label: "Boilerplate Patterns",
    description: "Guard clauses, status code checks, and template-like structures",
    weight: 10,
  },
  docstring_formality: {
    label: "Docstring Formality",
    description: "Formal JSDoc/TSDoc with @param/@returns annotations",
    weight: 10,
  },
  import_organization: {
    label: "Import Organization",
    description: "Alphabetically sorted and logically grouped imports",
    weight: 10,
  },
}

function SignalBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-[#1e2a4a] overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.round(score * 100)}%` }}
      />
    </div>
  )
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/30 text-red-300",
  high: "bg-orange-500/30 text-orange-300",
  medium: "bg-amber-500/30 text-amber-300",
  low: "bg-blue-500/30 text-blue-300",
}

const SEVERITY_BOX_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 border border-red-500/30 text-red-300",
  high: "bg-orange-500/10 border border-orange-500/30 text-orange-300",
  medium: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
  low: "bg-blue-500/10 border border-blue-500/30 text-blue-300",
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${SEVERITY_COLORS[severity] ?? ""}`}>
      {severity}
    </span>
  )
}

interface VulnFinding {
  id: string
  severity: string
  category: string
  title: string
  description: string
  line: number
  matchedText: string
  cwe?: string
}

interface VulnResult {
  total_findings: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  findings: VulnFinding[]
  scanned: boolean
}

interface DepVulnFinding {
  id: string
  package_name: string
  installed_version: string
  severity: string
  title: string
  description: string
  vulnerable_range: string
  patched_version: string | null
  cve?: string
  ghsa?: string
  url?: string
}

interface DepVulnSummary {
  total_dependencies: number
  critical: number
  high: number
  medium: number
  low: number
  total: number
  findings: DepVulnFinding[]
  ecosystems_scanned?: string[]
  per_ecosystem?: { ecosystem: string; manifest_file: string; total_dependencies: number; findings_count: number }[]
}

function DetectionSignalPanel({ signals }: { signals: Record<string, unknown> }) {
  const method = (signals.method as string) ?? "unknown"
  const metadata = signals.metadata as {
    matched?: boolean
    confidence?: number
    source?: string | null
    matchedText?: string | null
  } | null
  const style = signals.style as {
    score?: number
    signals?: Record<string, number>
  } | null
  const styleSignals = style?.signals ?? {}
  const vulnerabilities = signals.vulnerabilities as VulnResult | null

  return (
    <div className="bg-[#0d1321] border-t border-[#1e2a4a] px-6 py-4 space-y-4">
      {/* Detection method */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-medium uppercase text-[#5a6480]">Detection Method</span>
        </div>
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-0 text-xs">
          {method.replace(/_/g, " ").replace(/\+/g, " + ")}
        </Badge>
        {style?.score != null && (
          <span className="text-xs text-[#8892b0]">
            Overall style score: <span className="font-mono text-white">{(style.score * 100).toFixed(0)}%</span>
          </span>
        )}
      </div>

      {/* Metadata detection */}
      {metadata?.matched && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-xs font-medium text-amber-300 mb-1">Metadata Signal Detected</p>
          <p className="text-xs text-amber-200/80">
            Source: <span className="font-mono">{metadata.source ?? "unknown"}</span>
            {metadata.matchedText && (
              <> &mdash; matched: <span className="font-mono">&quot;{metadata.matchedText}&quot;</span></>
            )}
            {metadata.confidence != null && (
              <> &mdash; confidence: <span className="font-mono">{(metadata.confidence * 100).toFixed(0)}%</span></>
            )}
          </p>
        </div>
      )}

      {/* Security findings */}
      {vulnerabilities && vulnerabilities.total_findings > 0 && (
        <div>
          <p className="text-xs font-medium uppercase text-[#5a6480] mb-3">
            Security Findings
            <span className="ml-2 font-mono text-red-400">
              {vulnerabilities.total_findings} issue{vulnerabilities.total_findings > 1 ? "s" : ""}
            </span>
          </p>
          <div className="space-y-2">
            {vulnerabilities.findings.map((finding, idx) => (
              <div
                key={`${finding.id}-${finding.line}-${idx}`}
                className={`rounded-lg p-3 text-xs ${SEVERITY_BOX_COLORS[finding.severity] ?? ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={finding.severity} />
                  <span className="font-medium">{finding.title}</span>
                  <span className="text-[#5a6480] ml-auto font-mono">Line {finding.line}</span>
                  {finding.cwe && (
                    <span className="text-[#5a6480] font-mono">{finding.cwe}</span>
                  )}
                </div>
                <p className="text-[#8892b0]">{finding.description}</p>
                <p className="font-mono mt-1 text-[#c8cdd8] bg-black/20 rounded px-2 py-1 truncate">
                  {finding.matchedText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style signals breakdown */}
      {Object.keys(styleSignals).length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase text-[#5a6480] mb-3">Style Analysis Breakdown</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(styleSignals)
              .sort(([a], [b]) => {
                const wA = STYLE_SIGNAL_LABELS[a]?.weight ?? 0
                const wB = STYLE_SIGNAL_LABELS[b]?.weight ?? 0
                return wB - wA
              })
              .map(([key, score]) => {
                const info = STYLE_SIGNAL_LABELS[key]
                const barColor =
                  score > 0.7
                    ? "bg-red-500"
                    : score > 0.4
                    ? "bg-amber-500"
                    : "bg-green-500"
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#c8cdd8]">
                        {info?.label ?? key}
                        <span className="text-[#5a6480] ml-1">({info?.weight ?? 0}%)</span>
                      </span>
                      <span className="font-mono text-xs text-white">
                        {(score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <SignalBar score={score} color={barColor} />
                    {info?.description && (
                      <p className="text-[10px] text-[#5a6480] leading-tight">{info.description}</p>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* No data at all */}
      {Object.keys(styleSignals).length === 0 && !metadata?.matched && (!vulnerabilities || vulnerabilities.total_findings === 0) && (
        <p className="text-xs text-[#5a6480]">No detailed signal data available for this file.</p>
      )}
    </div>
  )
}

export default function RepositoryDetailPage() {
  const params = useParams()
  const repoId = params.id as string
  const queryClient = useQueryClient()
  const [activeScanId, setActiveScanId] = useState<string | null>(null)
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null)
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low" | "vulns">("all")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const fileTableRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useRepository(repoId)
  const { data: githubStatus } = useGitHubStatus()
  const isUploadRepo = data?.repository?.source === "upload"
  const { mutate: triggerScan, isPending: scanPending } = useTriggerScan()

  // Auto-detect running/pending scans from scan_history (survives navigation)
  const runningScanFromHistory = data?.scan_history?.find(
    s => s.status === "running" || s.status === "pending"
  )
  const trackingScanId = activeScanId ?? runningScanFromHistory?.id ?? null

  const { data: scanStatus } = useScanStatus(trackingScanId)

  const scanProgress = scanStatus?.data?.progress ?? 0
  const scanState = scanStatus?.data?.status
  const isScanning = trackingScanId && scanState !== "completed" && scanState !== "failed"

  // Find latest completed scan for file results
  const latestCompletedScanId = data?.scan_history?.find(s => s.status === "completed")?.id ?? null
  const { data: scanResults, isLoading: resultsLoading } = useScanResults(latestCompletedScanId)

  // When scan completes or fails, refresh data and clear tracking
  useEffect(() => {
    if (trackingScanId && scanState === "completed") {
      toast.success("Scan completed!")
      queryClient.invalidateQueries({ queryKey: ["repository", repoId] })
      queryClient.invalidateQueries({ queryKey: ["repositories"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["scan-results"] })
      setActiveScanId(null)
    } else if (trackingScanId && scanState === "failed") {
      toast.error("Scan failed: " + (scanStatus?.data?.error_message || "Unknown error"))
      setActiveScanId(null)
    }
  }, [trackingScanId, scanState, scanStatus, queryClient, repoId])

  const handleTriggerScan = () => {
    triggerScan(
      { repository_id: repoId, scan_type: "full" },
      {
        onSuccess: (res) => {
          const scanIds = res.data?.scan_ids
          if (scanIds?.length > 0) {
            setActiveScanId(scanIds[0])
            toast.success("Scan started for " + (data?.repository.full_name || "this repository"))
          }
        },
        onError: () => {
          toast.error("Failed to trigger scan")
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Info className="h-12 w-12 text-[#5a6480] mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Repository not found</h2>
        <p className="text-sm text-[#8892b0]">This repository may have been removed or you don&apos;t have access.</p>
      </div>
    )
  }

  const { repository: repo, latest_score, scan_history, score_trend, stats } = data

  // Get latest scan commit SHA
  const latestCompletedScan = scan_history.find(s => s.status === "completed")
  const latestScanCommit = latestCompletedScan?.commit_sha
    || (latestCompletedScan?.summary as { commit_sha?: string } | null)?.commit_sha
    || null

  // Extract dependency vulnerability data from latest scan summary
  const depVulns = (latestCompletedScan?.summary as { dependency_vulnerabilities?: DepVulnSummary } | null)
    ?.dependency_vulnerabilities ?? null

  const riskZone = latest_score?.risk_zone
  const riskBadgeVariant =
    riskZone === "critical" || riskZone === "high" ? "destructive" : "secondary"

  const breakdown = latest_score?.breakdown as Record<string, number> | undefined

  // Map score_trend to ScoreTrendChart format (expects { month, score })
  const trendData = score_trend.map((s) => ({
    month: formatDate(s.date, "MMM d"),
    score: s.score,
  }))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {isUploadRepo ? <FileArchive className="h-5 w-5 text-blue-400" /> : <GitBranch className="h-5 w-5 text-blue-400" />}
            <h1 className="text-2xl font-bold text-white">{isUploadRepo ? repo.name : repo.full_name}</h1>
            {riskZone && (
              <Badge variant={riskBadgeVariant} className="capitalize">
                {riskZone} Risk
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-[#8892b0]">
            {isUploadRepo && (
              <span className="flex items-center gap-1"><Upload className="h-3 w-3" /> Uploaded</span>
            )}
            {repo.language && <span>{repo.language}</span>}
            {!isUploadRepo && (
              <>
                <span>&middot;</span>
                <span>Branch: {repo.default_branch}</span>
              </>
            )}
            <span>&middot;</span>
            {repo.is_private ? (
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
            ) : (
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</span>
            )}
            {!isUploadRepo && githubStatus?.github_username && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  <Github className="h-3 w-3" />
                  @{githubStatus.github_username}
                </span>
              </>
            )}
            {!isUploadRepo && latestScanCommit && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  Last scan at{" "}
                  <a
                    href={`https://github.com/${repo.full_name}/commit/${latestScanCommit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-400 hover:text-blue-300"
                  >
                    {latestScanCommit.slice(0, 7)}
                  </a>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isUploadRepo && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://github.com/${repo.full_name}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          )}
          {isUploadRepo ? (
            <Button size="sm" onClick={() => setUploadDialogOpen(true)} disabled={!!isScanning}>
              {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isScanning ? "Scanning..." : "Upload New Version"}
            </Button>
          ) : (
            <Button size="sm" onClick={handleTriggerScan} disabled={scanPending || !!isScanning || !!runningScanFromHistory}>
              {scanPending || isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanIcon className="mr-2 h-4 w-4" />}
              {isScanning ? "Scanning..." : scanPending ? "Queuing..." : "Trigger Scan"}
            </Button>
          )}
        </div>
      </div>

      {/* Scan progress indicator */}
      {isScanning && (() => {
        const scanCommitInfo = scanStatus?.data?.summary as {
          commit_sha?: string
          commit_title?: string
          commit_date?: string
        } | null
        return (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  Scanning {repo.full_name}...
                </span>
                <span className="ml-auto font-mono text-sm text-blue-400">{scanProgress}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-blue-300/60 mt-2">
                {scanProgress < 10
                  ? "Initializing scan..."
                  : scanProgress < 80
                  ? "Analyzing files..."
                  : scanProgress < 90
                  ? "Calculating scores..."
                  : "Finalizing..."}
              </p>
              {scanCommitInfo?.commit_sha && (
                <div className="mt-3 flex items-center gap-2 rounded bg-[#0a0e1a] px-3 py-2 text-xs text-[#8892b0]">
                  <GitBranch className="h-3 w-3 text-blue-400 shrink-0" />
                  <a
                    href={`https://github.com/${repo.full_name}/commit/${scanCommitInfo.commit_sha}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-400 hover:text-blue-300 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {scanCommitInfo.commit_sha.slice(0, 7)}
                  </a>
                  {scanCommitInfo.commit_title && (
                    <span className="truncate">{scanCommitInfo.commit_title}</span>
                  )}
                  {scanCommitInfo.commit_date && (
                    <span className="ml-auto shrink-0 text-[#5a6480]">
                      {formatRelativeTime(scanCommitInfo.commit_date)}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Score overview */}
      {!latest_score ? (
        !isScanning ? (
          <Card className="border-[#1e2a4a] bg-[#131b2e]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ScanIcon className="h-10 w-10 text-[#5a6480] mb-4" />
              <h3 className="text-base font-semibold text-white mb-1">No scan data yet</h3>
              <p className="text-sm text-[#8892b0] mb-4">
                Trigger a scan to start tracking AI governance metrics for this repository.
              </p>
              <Button size="sm" onClick={handleTriggerScan} disabled={scanPending}>
                {scanPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanIcon className="mr-2 h-4 w-4" />}
                Run First Scan
              </Button>
            </CardContent>
          </Card>
        ) : null
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-[#1e2a4a] bg-[#131b2e]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#8892b0]">AI Debt Score</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <GaugeChart value={latest_score.score} size={160} />
            </CardContent>
          </Card>

          <Card className="border-[#1e2a4a] bg-[#131b2e]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#8892b0]">Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8892b0]">AI LOC Ratio</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {breakdown?.ai_loc_ratio != null
                    ? `${(breakdown.ai_loc_ratio * 100).toFixed(1)}%`
                    : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8892b0]">Review Coverage</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {breakdown?.review_coverage != null
                    ? `${(breakdown.review_coverage * 100).toFixed(1)}%`
                    : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8892b0]">Refactor Backlog</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {breakdown?.refactor_backlog_growth ?? breakdown?.refactor_backlog ?? "--"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8892b0]">Prompt Inconsistency</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {breakdown?.prompt_inconsistency != null
                    ? `${(breakdown.prompt_inconsistency * 100).toFixed(1)}%`
                    : "--"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1e2a4a] bg-[#131b2e]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#8892b0]">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <FileCodeIcon className="h-4 w-4 text-[#3b82f6]" />
                <span className="text-sm text-[#8892b0]">Files Scanned</span>
                <span className="ml-auto font-mono text-sm font-semibold text-white">
                  {stats.files_scanned}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldAlertIcon className="h-4 w-4 text-[#f59e0b]" />
                <span className="text-sm text-[#8892b0]">AI Files Detected</span>
                <span className="ml-auto font-mono text-sm font-semibold text-white">
                  {stats.ai_files_detected}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangleIcon className="h-4 w-4 text-[#ef4444]" />
                <span className="text-sm text-[#8892b0]">Active Alerts</span>
                <span className="ml-auto font-mono text-sm font-semibold text-white">
                  {stats.active_alerts}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon className="h-4 w-4 text-[#8892b0]" />
                <span className="text-sm text-[#8892b0]">Last Scan</span>
                <span className="ml-auto text-sm text-white">
                  {repo.last_scan_at ? formatRelativeTime(repo.last_scan_at) : "Never"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score Trend */}
      {trendData.length > 0 && (
        <Card className="border-[#1e2a4a] bg-[#131b2e]">
          <CardHeader>
            <CardTitle className="text-white">Score Trend</CardTitle>
            <CardDescription className="text-[#8892b0]">
              AI Debt Score over recent scans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart data={trendData} />
          </CardContent>
        </Card>
      )}

      {/* Vulnerability Summary */}
      {stats.vulnerabilities && stats.vulnerabilities.total > 0 && (
        <Card className="border-red-500/20 bg-[#131b2e]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="h-4 w-4 text-red-400" />
              <CardTitle className="text-sm text-red-300">Security Vulnerabilities</CardTitle>
              <Badge variant="destructive" className="ml-auto text-xs">
                {stats.vulnerabilities.total} finding{stats.vulnerabilities.total > 1 ? "s" : ""}
              </Badge>
            </div>
            <CardDescription className="text-[#5a6480]">
              Detected in the latest scan. Click file rows below to see details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-red-400">
                  {stats.vulnerabilities.critical}
                </p>
                <p className="text-xs text-[#8892b0]">Critical</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-orange-400">
                  {stats.vulnerabilities.high}
                </p>
                <p className="text-xs text-[#8892b0]">High</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-amber-400">
                  {stats.vulnerabilities.medium}
                </p>
                <p className="text-xs text-[#8892b0]">Medium</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-blue-400">
                  {stats.vulnerabilities.low}
                </p>
                <p className="text-xs text-[#8892b0]">Low</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full border-red-500/30 text-red-300 hover:bg-red-500/10"
              onClick={() => {
                setRiskFilter("vulns")
                setExpandedFileId(null)
                setTimeout(() => {
                  fileTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }, 100)
              }}
            >
              <ShieldAlertIcon className="mr-2 h-4 w-4" />
              View Vulnerable Files
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dependency Vulnerabilities */}
      {depVulns && depVulns.total > 0 && (
        <Card className="border-orange-500/20 bg-[#131b2e]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <PackageIcon className="h-4 w-4 text-orange-400" />
              <CardTitle className="text-sm text-orange-300">Dependency Vulnerabilities</CardTitle>
              <Badge className="ml-auto text-xs bg-orange-500/20 text-orange-300 border-0">
                {depVulns.total} package{depVulns.total > 1 ? "s" : ""}
              </Badge>
            </div>
            <CardDescription className="text-[#5a6480]">
              Known vulnerable packages found in {depVulns.per_ecosystem?.[0]?.manifest_file ?? "dependencies"} ({depVulns.total_dependencies} dependencies scanned)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-red-400">{depVulns.critical}</p>
                <p className="text-xs text-[#8892b0]">Critical</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-orange-400">{depVulns.high}</p>
                <p className="text-xs text-[#8892b0]">High</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-amber-400">{depVulns.medium}</p>
                <p className="text-xs text-[#8892b0]">Medium</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-blue-400">{depVulns.low}</p>
                <p className="text-xs text-[#8892b0]">Low</p>
              </div>
            </div>
            <div className="space-y-2">
              {depVulns.findings.map((finding, idx) => (
                <div
                  key={`${finding.id}-${idx}`}
                  className={`rounded-lg p-3 text-xs ${SEVERITY_BOX_COLORS[finding.severity] ?? ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={finding.severity} />
                    <span className="font-medium font-mono">{finding.package_name}</span>
                    <span className="text-[#5a6480]">{finding.installed_version}</span>
                    <span className="ml-auto text-[#5a6480] font-mono">
                      {finding.cve && (
                        <a
                          href={finding.url ?? `https://nvd.nist.gov/vuln/detail/${finding.cve}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {finding.cve}
                        </a>
                      )}
                    </span>
                  </div>
                  <p className="font-medium mb-0.5">{finding.title}</p>
                  <p className="text-[#8892b0]">{finding.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-[#5a6480]">
                    <span>Vulnerable: <span className="font-mono text-red-400">{finding.vulnerable_range}</span></span>
                    {finding.patched_version && (
                      <span>Fix: upgrade to <span className="font-mono text-green-400">&gt;={finding.patched_version}</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Analysis Results */}
      {latestCompletedScanId && !resultsLoading && scanResults && scanResults.results.length > 0 && (
        <>
          {/* Risk Summary + Recommendations */}
          {(() => {
            const results = scanResults.results
            const highRisk = results.filter(f => f.risk_level === "high")
            const mediumRisk = results.filter(f => f.risk_level === "medium")
            const lowRisk = results.filter(f => f.risk_level === "low")
            const totalAiLoc = results.reduce((sum, f) => sum + f.ai_loc, 0)
            const totalLoc = results.reduce((sum, f) => sum + f.total_loc, 0)
            const avgProb = results.length > 0
              ? Math.round((results.reduce((sum, f) => sum + f.ai_probability, 0) / results.length) * 100)
              : 0

            const recommendations: Array<{ severity: "high" | "medium" | "low"; text: string }> = []

            if (highRisk.length > 0) {
              recommendations.push({
                severity: "high",
                text: `${highRisk.length} file${highRisk.length > 1 ? "s" : ""} flagged as high risk (>70% AI probability). Review these files for correctness, security vulnerabilities, and test coverage. Priority: ${highRisk.slice(0, 3).map(f => f.file_path.split("/").pop()).join(", ")}`,
              })
            }
            if (mediumRisk.length > 5) {
              recommendations.push({
                severity: "medium",
                text: `${mediumRisk.length} files in medium risk range (40-70%). These show AI-generated patterns like consistent naming and boilerplate structure. Add code reviews for any files handling authentication, data, or business logic.`,
              })
            }
            if (totalLoc > 0 && totalAiLoc / totalLoc > 0.5) {
              recommendations.push({
                severity: "high",
                text: `Over 50% of total LOC is estimated AI-generated. Consider establishing AI code review policies and tracking which AI tools are used for code generation.`,
              })
            }
            if (avgProb > 35 && avgProb <= 45 && highRisk.length === 0) {
              recommendations.push({
                severity: "low",
                text: `Average AI probability is ${avgProb}% with no high-risk files. This is a normal range — the style analyzer detects common patterns in well-structured code. No immediate action needed.`,
              })
            }
            // Vulnerability recommendations
            const vulnStats = stats.vulnerabilities
            if (vulnStats) {
              if (vulnStats.critical > 0) {
                recommendations.unshift({
                  severity: "high",
                  text: `${vulnStats.critical} critical security finding${vulnStats.critical > 1 ? "s" : ""} detected (hardcoded secrets, code injection). These must be remediated immediately before merging.`,
                })
              }
              if (vulnStats.high > 0) {
                recommendations.push({
                  severity: "high",
                  text: `${vulnStats.high} high-severity security finding${vulnStats.high > 1 ? "s" : ""} detected (XSS, command injection). Review flagged files and apply fixes.`,
                })
              }
              if (vulnStats.medium > 0) {
                recommendations.push({
                  severity: "medium",
                  text: `${vulnStats.medium} medium-severity security finding${vulnStats.medium > 1 ? "s" : ""} detected (weak crypto, insecure cookies). Schedule remediation within the current sprint.`,
                })
              }
            }
            // Dependency vulnerability recommendations
            if (depVulns && depVulns.total > 0) {
              if (depVulns.critical > 0) {
                recommendations.unshift({
                  severity: "high",
                  text: `${depVulns.critical} critical vulnerable package${depVulns.critical > 1 ? "s" : ""} in dependencies (prototype pollution, code injection). Run npm audit fix or update packages immediately.`,
                })
              }
              if (depVulns.high > 0) {
                recommendations.push({
                  severity: "high",
                  text: `${depVulns.high} high-severity vulnerable package${depVulns.high > 1 ? "s" : ""} found (ReDoS, SSRF). Update affected dependencies to patched versions.`,
                })
              }
              if (depVulns.medium + depVulns.low > 0) {
                recommendations.push({
                  severity: "medium",
                  text: `${depVulns.medium + depVulns.low} medium/low dependency finding${(depVulns.medium + depVulns.low) > 1 ? "s" : ""}. Review and update when possible.`,
                })
              }
            }

            if (recommendations.length === 0) {
              recommendations.push({
                severity: "low",
                text: "No significant AI governance or security concerns detected. Continue monitoring with regular scans.",
              })
            }

            return (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Risk Distribution */}
                <Card className="border-[#1e2a4a] bg-[#131b2e]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-[#8892b0]">Risk Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-sm text-[#8892b0]">High Risk</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-red-400">{highRisk.length} files</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="text-sm text-[#8892b0]">Medium Risk</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-amber-400">{mediumRisk.length} files</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-sm text-[#8892b0]">Low Risk</span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-green-400">{lowRisk.length} files</span>
                    </div>
                    <div className="border-t border-[#1e2a4a] pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8892b0]">Avg AI Probability</span>
                        <span className="font-mono text-sm font-semibold text-white">{avgProb}%</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-[#8892b0]">AI LOC / Total LOC</span>
                        <span className="font-mono text-sm font-semibold text-white">
                          {totalAiLoc.toLocaleString()} / {totalLoc.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="border-[#1e2a4a] bg-[#131b2e] lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-[#8892b0]">Recommendations</CardTitle>
                    <CardDescription className="text-[#5a6480]">
                      Actions based on scan analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className={`rounded-lg p-3 text-sm ${
                          rec.severity === "high"
                            ? "bg-red-500/10 border border-red-500/20 text-red-300"
                            : rec.severity === "medium"
                            ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                            : "bg-green-500/10 border border-green-500/20 text-green-300"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {rec.severity === "high" ? (
                            <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                          ) : rec.severity === "medium" ? (
                            <ShieldAlertIcon className="h-4 w-4 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                          )}
                          <span>{rec.text}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {/* File Table */}
          <Card ref={fileTableRef} className="border-[#1e2a4a] bg-[#131b2e]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white">File Analysis Results</CardTitle>
                  <CardDescription className="text-[#8892b0] mt-1">
                    {scanResults.total} files analyzed. Click any row to see detection details{stats.vulnerabilities && stats.vulnerabilities.total > 0 ? " and security findings" : ""}.
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  {(["all", "high", "medium", "low", "vulns"] as const).map((level) => (
                    <Button
                      key={level}
                      variant={riskFilter === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setRiskFilter(level); setExpandedFileId(null) }}
                      className={
                        riskFilter === level
                          ? level === "high"
                            ? "bg-red-600 text-white text-xs"
                            : level === "medium"
                            ? "bg-amber-600 text-white text-xs"
                            : level === "low"
                            ? "bg-green-600 text-white text-xs"
                            : level === "vulns"
                            ? "bg-red-700 text-white text-xs"
                            : "bg-blue-600 text-white text-xs"
                          : "border-[#1e2a4a] text-[#8892b0] text-xs"
                      }
                    >
                      {level === "vulns" ? (
                        <span className="flex items-center gap-1"><ShieldAlertIcon className="h-3 w-3" />Vulns</span>
                      ) : (
                        level.charAt(0).toUpperCase() + level.slice(1)
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-[#1e2a4a] overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-[#1e2a4a] bg-[#0a0e1a]">
                      <th className="w-10 px-2 py-3" />
                      <th className="text-left text-xs font-medium uppercase text-[#5a6480] px-4 py-3">File Path</th>
                      <th className="text-left text-xs font-medium uppercase text-[#5a6480] px-4 py-3 w-24">Language</th>
                      <th className="text-right text-xs font-medium uppercase text-[#5a6480] px-4 py-3 w-20">LOC</th>
                      <th className="text-right text-xs font-medium uppercase text-[#5a6480] px-4 py-3 w-20">AI LOC</th>
                      <th className="text-right text-xs font-medium uppercase text-[#5a6480] px-4 py-3 w-20">AI Prob</th>
                      <th className="text-left text-xs font-medium uppercase text-[#5a6480] px-4 py-3 w-24">Risk</th>
                      <th className="text-right text-xs font-medium uppercase text-[#5a6480] px-4 py-3 w-16">Vulns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResults.results
                    .filter((f) => {
                      if (riskFilter === "all") return true
                      if (riskFilter === "vulns") {
                        const v = f.detection_signals?.vulnerabilities as VulnResult | undefined
                        return v != null && v.total_findings > 0
                      }
                      return f.risk_level === riskFilter
                    })
                    .map((file) => {
                      const isExpanded = expandedFileId === file.id
                      return (
                        <Fragment key={file.id}>
                          <tr
                            className={`cursor-pointer transition-colors border-b border-[#1e2a4a]/50 ${
                              isExpanded ? "bg-[#182040]" : "hover:bg-[#182040]"
                            }`}
                            onClick={() => setExpandedFileId(isExpanded ? null : file.id)}
                          >
                            <td className="px-2 py-3 text-center">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-[#5a6480] inline-block" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-[#5a6480] inline-block" />
                              )}
                            </td>
                            <td className="text-sm text-[#e8eaf0] px-4 py-3 font-mono truncate" title={file.file_path}>
                              <span className="flex items-center gap-1.5">
                                {(() => {
                                  const v = file.detection_signals?.vulnerabilities as VulnResult | undefined
                                  if (v && v.total_findings > 0) {
                                    return <ShieldAlertIcon className="h-3.5 w-3.5 shrink-0 text-red-400" />
                                  }
                                  return null
                                })()}
                                <span className="truncate">{file.file_path}</span>
                              </span>
                            </td>
                            <td className="text-sm text-[#8892b0] px-4 py-3">{file.language ?? "--"}</td>
                            <td className="text-sm text-[#e8eaf0] px-4 py-3 text-right font-mono">
                              {file.total_loc}
                            </td>
                            <td className="text-sm text-[#e8eaf0] px-4 py-3 text-right font-mono">
                              {file.ai_loc}
                            </td>
                            <td className="text-sm px-4 py-3 text-right font-mono">
                              <span
                                className={
                                  file.ai_probability > 0.7
                                    ? "text-red-400"
                                    : file.ai_probability > 0.4
                                    ? "text-amber-400"
                                    : "text-green-400"
                                }
                              >
                                {(file.ai_probability * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={file.risk_level === "high" ? "destructive" : "secondary"}
                                className={
                                  file.risk_level === "high"
                                    ? ""
                                    : file.risk_level === "medium"
                                    ? "bg-amber-500/20 text-amber-400 border-0"
                                    : "bg-green-500/20 text-green-400 border-0"
                                }
                              >
                                {file.risk_level}
                              </Badge>
                            </td>
                            <td className="text-right px-4 py-3">
                              {(() => {
                                const v = file.detection_signals?.vulnerabilities as VulnResult | undefined
                                if (!v || v.total_findings === 0) return <span className="text-xs text-[#5a6480]">--</span>
                                const color = v.critical_count > 0 ? "text-red-400" : v.high_count > 0 ? "text-orange-400" : v.medium_count > 0 ? "text-amber-400" : "text-blue-400"
                                return <span className={`font-mono text-xs font-semibold ${color}`}>{v.total_findings}</span>
                              })()}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="p-0">
                                <DetectionSignalPanel signals={file.detection_signals} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* File results loading state */}
      {latestCompletedScanId && resultsLoading && (
        <Card className="border-[#1e2a4a] bg-[#131b2e]">
          <CardHeader>
            <CardTitle className="text-white">File Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-[#1e2a4a]" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan history */}
      {scan_history.length > 0 && (
        <Card className="border-[#1e2a4a] bg-[#131b2e]">
          <CardHeader>
            <CardTitle className="text-white">Scan History</CardTitle>
            <CardDescription className="text-[#8892b0]">
              Recent scans for this repository
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scan_history.map((scan) => {
                const summary = scan.summary as {
                  total_files_scanned?: number
                  ai_files_detected?: number
                  ai_loc_percentage?: number
                  debt_score?: number
                  risk_zone?: string
                  commit_sha?: string
                  vulnerabilities?: { total?: number; critical?: number; high?: number }
                  dependency_vulnerabilities?: { total?: number }
                } | null
                const scanCommit = scan.commit_sha || summary?.commit_sha || null

                const scoreColor =
                  summary?.risk_zone === "critical"
                    ? "text-red-400"
                    : summary?.risk_zone === "caution"
                    ? "text-amber-400"
                    : "text-green-400"

                return (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-lg border border-[#1e2a4a] bg-[#0a0e1a] p-4"
                  >
                    <div className="flex items-center gap-3">
                      {scan.status === "completed" ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : scan.status === "failed" ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : scan.status === "running" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                      ) : (
                        <ClockIcon className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium capitalize text-white">
                          {scan.status}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#8892b0]">
                          <span>{formatRelativeTime(scan.created_at)}</span>
                          {scanCommit && (
                            <>
                              <span>&middot;</span>
                              <a
                                href={`https://github.com/${repo.full_name}/commit/${scanCommit}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-blue-400 hover:text-blue-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {scanCommit.slice(0, 7)}
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {summary && scan.status === "completed" ? (
                        <>
                          <div className="text-right">
                            <p className="font-mono text-sm font-semibold text-white">
                              {summary.total_files_scanned ?? "--"}
                            </p>
                            <p className="text-xs text-[#8892b0]">Files</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-semibold text-[#f59e0b]">
                              {summary.ai_files_detected ?? "--"}
                            </p>
                            <p className="text-xs text-[#8892b0]">AI Detected</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-semibold text-white">
                              {summary.ai_loc_percentage != null ? `${summary.ai_loc_percentage}%` : "--"}
                            </p>
                            <p className="text-xs text-[#8892b0]">AI LOC</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono text-sm font-semibold ${scoreColor}`}>
                              {summary.debt_score ?? "--"}
                            </p>
                            <p className="text-xs text-[#8892b0]">Score</p>
                          </div>
                          {summary.vulnerabilities && (summary.vulnerabilities.total ?? 0) > 0 && (
                            <div className="text-right">
                              <p className="font-mono text-sm font-semibold text-red-400">
                                {summary.vulnerabilities.total}
                              </p>
                              <p className="text-xs text-[#8892b0]">Vulns</p>
                            </div>
                          )}
                          {summary.dependency_vulnerabilities && (summary.dependency_vulnerabilities.total ?? 0) > 0 && (
                            <div className="text-right">
                              <p className="font-mono text-sm font-semibold text-orange-400">
                                {summary.dependency_vulnerabilities.total}
                              </p>
                              <p className="text-xs text-[#8892b0]">Deps</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <Badge
                          variant={scan.status === "failed" ? "destructive" : "secondary"}
                          className="text-xs capitalize"
                        >
                          {scan.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload new version dialog (for upload repos) */}
      {isUploadRepo && (
        <UploadZipDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          defaultName={repo.name}
        />
      )}
    </div>
  )
}
