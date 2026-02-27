"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Container, GitBranch, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

interface InfraFinding {
  id: string
  severity: string
  fileType: string
  title: string
  description: string
  remediation: string
  file_path: string
  line?: number
  matchedText?: string
}

interface InfraResult {
  total_findings: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  findings: InfraFinding[]
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-500/20", text: "text-red-400" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400" },
  medium: { bg: "bg-amber-500/20", text: "text-amber-400" },
  low: { bg: "bg-blue-500/20", text: "text-blue-400" },
}

const FILE_TYPE_CONFIG: Record<string, { icon: typeof Container; label: string; color: string }> = {
  dockerfile: { icon: Container, label: "Dockerfile", color: "text-cyan-400" },
  "github-actions": { icon: GitBranch, label: "GitHub Actions", color: "text-purple-400" },
  "docker-compose": { icon: Container, label: "Docker Compose", color: "text-teal-400" },
}

export function InfrastructureCard({ data }: { data: InfraResult }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    data.critical_count > 0 || data.high_count > 0 ? "critical-high" : null
  )

  // Group findings by file type
  const grouped = data.findings.reduce<Record<string, InfraFinding[]>>((acc, f) => {
    const key = f.fileType
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  const borderColor = data.critical_count > 0
    ? "border-red-500/30"
    : data.high_count > 0
      ? "border-orange-500/30"
      : "border-[#1e2a4a]"

  return (
    <Card className={`${borderColor} bg-[#131b2e]`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <CardTitle className="text-sm text-cyan-300">Infrastructure Security</CardTitle>
          <Badge className="ml-auto text-xs border-0 bg-cyan-500/20 text-cyan-400">
            {data.total_findings} issue{data.total_findings !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardDescription className="text-[#5a6480]">
          Dockerfile and CI/CD workflow security analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Severity summary */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Critical", count: data.critical_count, color: "text-red-400" },
            { label: "High", count: data.high_count, color: "text-orange-400" },
            { label: "Medium", count: data.medium_count, color: "text-amber-400" },
            { label: "Low", count: data.low_count, color: "text-blue-400" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-[#5a6480]">{item.label}</p>
              <p className={`font-mono text-lg font-bold ${item.color}`}>{item.count}</p>
            </div>
          ))}
        </div>

        {/* Grouped findings by file type */}
        <div className="space-y-3">
          {Object.entries(grouped).map(([fileType, findings]) => {
            const config = FILE_TYPE_CONFIG[fileType] ?? { icon: Shield, label: fileType, color: "text-slate-400" }
            const Icon = config.icon
            const isExpanded = expandedGroup === fileType

            return (
              <div key={fileType} className="rounded-lg bg-[#0c1322] border border-[#1e2a4a]">
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : fileType)}
                  className="flex items-center gap-2 w-full p-3 text-left"
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-sm font-medium text-slate-200">{config.label}</span>
                  <Badge className="text-[10px] border-0 bg-[#1e2a4a] text-[#8b95b0] ml-1">
                    {findings.length}
                  </Badge>
                  <div className="ml-auto">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-[#5a6480]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#5a6480]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {findings.map((finding, idx) => {
                      const style = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.medium
                      return (
                        <div key={idx} className="p-2 rounded bg-[#131b2e] border border-[#1e2a4a]">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-[10px] border-0 ${style.bg} ${style.text}`}>
                              {finding.severity}
                            </Badge>
                            <span className="text-xs font-mono text-[#5a6480]">{finding.id}</span>
                            <span className="text-sm font-medium text-slate-200 truncate">{finding.title}</span>
                          </div>
                          <p className="text-xs text-[#8b95b0] mb-1">{finding.description}</p>
                          {finding.file_path && (
                            <p className="text-[10px] text-[#5a6480] mb-1">
                              {finding.file_path}{finding.line ? `:${finding.line}` : ""}
                            </p>
                          )}
                          <p className="text-xs text-emerald-400/70">{finding.remediation}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
