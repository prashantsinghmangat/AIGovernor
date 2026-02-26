"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  GitBranchIcon,
  ScanIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FileCodeIcon,
  ShieldAlertIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExternalLinkIcon,
  Loader2,
} from "lucide-react"
import { useTriggerScan } from "@/hooks/use-scan"
import { toast } from "sonner"
import { GaugeChart } from "@/components/dashboard/gauge-chart"
import { ScoreTrendChart } from "@/components/charts/score-trend-chart"
import { formatRelativeTime } from "@/lib/utils/format"

async function fetchRepository(id: string) {
  const res = await fetch(`/api/repositories?id=${id}`)
  if (!res.ok) throw new Error("Failed to fetch repository")
  return res.json()
}

async function fetchRepoScores(id: string) {
  const res = await fetch(`/api/scores?repository_id=${id}`)
  if (!res.ok) throw new Error("Failed to fetch scores")
  return res.json()
}

export default function RepositoryDetailPage() {
  const params = useParams()
  const repoId = params.id as string

  const { data: repoData, isLoading: repoLoading } = useQuery({
    queryKey: ["repository", repoId],
    queryFn: () => fetchRepository(repoId),
  })

  const { data: scoreData, isLoading: scoreLoading } = useQuery({
    queryKey: ["scores", repoId],
    queryFn: () => fetchRepoScores(repoId),
  })

  const { mutate: triggerScan, isPending: scanPending } = useTriggerScan()

  const handleTriggerScan = () => {
    triggerScan(
      { repository_id: repoId, scan_type: "full" },
      {
        onSuccess: () => {
          toast.success("Scan queued for " + (repo?.full_name || "this repository"))
        },
        onError: () => {
          toast.error("Failed to trigger scan")
        },
      }
    )
  }

  const repo = repoData?.data
  const scores = scoreData?.data

  if (repoLoading || scoreLoading) {
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

  // Mock data for when API returns no data yet
  const mockRepo = {
    full_name: "org/repository",
    language: "TypeScript",
    default_branch: "main",
    is_active: true,
    last_scan_at: new Date().toISOString(),
    github_url: "#",
  }

  const mockScore = {
    overall_score: 42,
    ai_loc_ratio: 0.35,
    review_coverage: 0.72,
    refactor_backlog: 12,
    prompt_inconsistency: 0.18,
    risk_level: "medium" as const,
  }

  const displayRepo = repo || mockRepo
  const displayScore = scores?.current || mockScore

  const riskColor =
    displayScore.risk_level === "critical"
      ? "text-red-500"
      : displayScore.risk_level === "high"
        ? "text-orange-500"
        : displayScore.risk_level === "medium"
          ? "text-yellow-500"
          : "text-green-500"

  const riskBadgeVariant =
    displayScore.risk_level === "critical" || displayScore.risk_level === "high"
      ? "destructive"
      : "secondary"

  const mockTrendData = [
    { date: "Week 1", score: 55 },
    { date: "Week 2", score: 52 },
    { date: "Week 3", score: 48 },
    { date: "Week 4", score: 45 },
    { date: "Week 5", score: 42 },
  ]

  const mockScanHistory = [
    {
      id: "1",
      status: "completed",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      files_scanned: 142,
      ai_files_detected: 23,
    },
    {
      id: "2",
      status: "completed",
      created_at: new Date(Date.now() - 604800000).toISOString(),
      files_scanned: 138,
      ai_files_detected: 21,
    },
    {
      id: "3",
      status: "completed",
      created_at: new Date(Date.now() - 1209600000).toISOString(),
      files_scanned: 130,
      ai_files_detected: 18,
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{displayRepo.full_name}</h1>
            <Badge variant={riskBadgeVariant} className="capitalize">
              {displayScore.risk_level} Risk
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[#8892b0]">
            {displayRepo.language} &middot; Branch: {displayRepo.default_branch}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={displayRepo.github_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              View on GitHub
            </a>
          </Button>
          <Button size="sm" onClick={handleTriggerScan} disabled={scanPending}>
            {scanPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanIcon className="mr-2 h-4 w-4" />}
            {scanPending ? "Scanning..." : "Trigger Scan"}
          </Button>
        </div>
      </div>

      {/* Score overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-[#1e2a4a] bg-[#131b2e]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#8892b0]">
              AI Debt Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <GaugeChart value={displayScore.overall_score} size={160} />
          </CardContent>
        </Card>

        <Card className="border-[#1e2a4a] bg-[#131b2e]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#8892b0]">
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8892b0]">AI LOC Ratio</span>
              <span className="font-mono text-sm font-semibold">
                {(displayScore.ai_loc_ratio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8892b0]">Review Coverage</span>
              <span className="font-mono text-sm font-semibold">
                {(displayScore.review_coverage * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8892b0]">Refactor Backlog</span>
              <span className="font-mono text-sm font-semibold">
                {displayScore.refactor_backlog}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8892b0]">
                Prompt Inconsistency
              </span>
              <span className="font-mono text-sm font-semibold">
                {(displayScore.prompt_inconsistency * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#1e2a4a] bg-[#131b2e]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#8892b0]">
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <FileCodeIcon className="h-4 w-4 text-[#3b82f6]" />
              <span className="text-sm text-[#8892b0]">Files Scanned</span>
              <span className="ml-auto font-mono text-sm font-semibold">
                142
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldAlertIcon className="h-4 w-4 text-[#f59e0b]" />
              <span className="text-sm text-[#8892b0]">AI Files Detected</span>
              <span className="ml-auto font-mono text-sm font-semibold">
                23
              </span>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangleIcon className="h-4 w-4 text-[#ef4444]" />
              <span className="text-sm text-[#8892b0]">Active Alerts</span>
              <span className="ml-auto font-mono text-sm font-semibold">
                3
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ClockIcon className="h-4 w-4 text-[#8892b0]" />
              <span className="text-sm text-[#8892b0]">Last Scan</span>
              <span className="ml-auto text-sm">
                {formatRelativeTime(displayRepo.last_scan_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Trend */}
      <Card className="border-[#1e2a4a] bg-[#131b2e]">
        <CardHeader>
          <CardTitle>Score Trend</CardTitle>
          <CardDescription className="text-[#8892b0]">
            AI Debt Score over the past 5 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoreTrendChart data={scores?.trend || mockTrendData} />
        </CardContent>
      </Card>

      {/* Scan history */}
      <Card className="border-[#1e2a4a] bg-[#131b2e]">
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription className="text-[#8892b0]">
            Recent scans for this repository
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(scores?.scans || mockScanHistory).map(
              (scan: {
                id: string
                status: string
                created_at: string
                files_scanned: number
                ai_files_detected: number
              }) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-lg border border-[#1e2a4a] bg-[#0a0e1a] p-4"
                >
                  <div className="flex items-center gap-3">
                    {scan.status === "completed" ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {scan.status}
                      </p>
                      <p className="text-xs text-[#8892b0]">
                        {formatRelativeTime(scan.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold">
                        {scan.files_scanned}
                      </p>
                      <p className="text-xs text-[#8892b0]">Files</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-[#f59e0b]">
                        {scan.ai_files_detected}
                      </p>
                      <p className="text-xs text-[#8892b0]">AI Detected</p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
