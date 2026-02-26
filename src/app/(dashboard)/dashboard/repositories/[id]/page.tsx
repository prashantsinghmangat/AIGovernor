"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { useRepository } from "@/hooks/use-repository"
import { useTriggerScan, useScanStatus } from "@/hooks/use-scan"
import { toast } from "sonner"
import { GaugeChart } from "@/components/dashboard/gauge-chart"
import { ScoreTrendChart } from "@/components/charts/score-trend-chart"
import { formatRelativeTime, formatDate } from "@/lib/utils/format"

export default function RepositoryDetailPage() {
  const params = useParams()
  const repoId = params.id as string
  const queryClient = useQueryClient()
  const [activeScanId, setActiveScanId] = useState<string | null>(null)

  const { data, isLoading } = useRepository(repoId)
  const { mutate: triggerScan, isPending: scanPending } = useTriggerScan()
  const { data: scanStatus } = useScanStatus(activeScanId)

  const scanProgress = scanStatus?.data?.progress ?? 0
  const scanState = scanStatus?.data?.status
  const isScanning = activeScanId && scanState !== "completed" && scanState !== "failed"

  // When scan completes or fails, refresh data and clear tracking
  useEffect(() => {
    if (activeScanId && scanState === "completed") {
      toast.success("Scan completed!")
      queryClient.invalidateQueries({ queryKey: ["repository", repoId] })
      queryClient.invalidateQueries({ queryKey: ["repositories"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      setActiveScanId(null)
    } else if (activeScanId && scanState === "failed") {
      toast.error("Scan failed: " + (scanStatus?.data?.error_message || "Unknown error"))
      setActiveScanId(null)
    }
  }, [activeScanId, scanState, scanStatus, queryClient, repoId])

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
            <GitBranch className="h-5 w-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">{repo.full_name}</h1>
            {riskZone && (
              <Badge variant={riskBadgeVariant} className="capitalize">
                {riskZone} Risk
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-[#8892b0]">
            {repo.language && <span>{repo.language}</span>}
            <span>&middot;</span>
            <span>Branch: {repo.default_branch}</span>
            <span>&middot;</span>
            {repo.is_private ? (
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
            ) : (
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <Button size="sm" onClick={handleTriggerScan} disabled={scanPending || !!isScanning}>
            {scanPending || isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanIcon className="mr-2 h-4 w-4" />}
            {isScanning ? "Scanning..." : scanPending ? "Queuing..." : "Trigger Scan"}
          </Button>
        </div>
      </div>

      {/* Scan progress indicator */}
      {isScanning && (
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
          </CardContent>
        </Card>
      )}

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
                const summary = scan.summary as Record<string, unknown> | null;
                return (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-lg border border-[#1e2a4a] bg-[#0a0e1a] p-4"
                  >
                    <div className="flex items-center gap-3">
                      {scan.status === "completed" ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : scan.status === "failed" ? (
                        <AlertTriangleIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <ClockIcon className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium capitalize text-white">
                          {scan.status}
                        </p>
                        <p className="text-xs text-[#8892b0]">
                          {formatRelativeTime(scan.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {summary && (
                        <>
                          <div className="text-right">
                            <p className="font-mono text-sm font-semibold text-white">
                              {(summary.total_files_scanned as number) ?? "--"}
                            </p>
                            <p className="text-xs text-[#8892b0]">Files</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-semibold text-[#f59e0b]">
                              {(summary.ai_files_detected as number) ?? "--"}
                            </p>
                            <p className="text-xs text-[#8892b0]">AI Detected</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
