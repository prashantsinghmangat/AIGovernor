"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, FileWarning, KeyRound, Lock, FileKey } from "lucide-react"

interface SensitiveFileFinding {
  file_path: string
  severity: string
  category: string
  title: string
  description: string
  remediation: string
}

interface SensitiveFileResult {
  total_findings: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  findings: SensitiveFileFinding[]
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-500/20", text: "text-red-400" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400" },
  medium: { bg: "bg-amber-500/20", text: "text-amber-400" },
  low: { bg: "bg-blue-500/20", text: "text-blue-400" },
}

const CATEGORY_ICONS: Record<string, typeof FileWarning> = {
  "env-file": FileWarning,
  "private-key": KeyRound,
  credentials: Lock,
  certificate: FileKey,
  "config-secret": ShieldAlert,
}

export function SensitiveFilesCard({ data }: { data: SensitiveFileResult }) {
  if (data.total_findings === 0) return null

  return (
    <Card className="border-red-500/30 bg-[#131b2e]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <CardTitle className="text-sm text-red-300">Sensitive Files Detected</CardTitle>
          <Badge className="ml-auto text-xs border-0 bg-red-500/20 text-red-400">
            {data.total_findings} file{data.total_findings !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardDescription className="text-[#5a6480]">
          Files that may contain credentials, secrets, or private keys
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

        {/* Findings list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {data.findings.map((finding, idx) => {
            const Icon = CATEGORY_ICONS[finding.category] ?? FileWarning
            const style = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.medium
            return (
              <div
                key={idx}
                className="flex items-start gap-3 p-2 rounded-lg bg-[#0c1322] border border-[#1e2a4a]"
              >
                <Icon className={`h-4 w-4 mt-0.5 ${style.text}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {finding.file_path}
                    </p>
                    <Badge className={`text-[10px] border-0 shrink-0 ${style.bg} ${style.text}`}>
                      {finding.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#5a6480] mt-0.5">{finding.title}</p>
                  <p className="text-xs text-emerald-400/70 mt-0.5">{finding.remediation}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
