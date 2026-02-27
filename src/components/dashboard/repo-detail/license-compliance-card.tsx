"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scale, CheckCircle2, AlertTriangle, ShieldAlert, HelpCircle } from "lucide-react"

interface LicenseFinding {
  package_name: string
  version: string
  license: string
  risk: string
  ecosystem: string
}

interface LicenseResult {
  total_packages: number
  permissive_count: number
  weak_copyleft_count: number
  strong_copyleft_count: number
  unknown_count: number
  findings: LicenseFinding[]
}

const RISK_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  permissive: { bg: "bg-green-500/20", text: "text-green-400", icon: CheckCircle2 },
  "weak-copyleft": { bg: "bg-amber-500/20", text: "text-amber-400", icon: AlertTriangle },
  "strong-copyleft": { bg: "bg-red-500/20", text: "text-red-400", icon: ShieldAlert },
  unknown: { bg: "bg-slate-500/20", text: "text-slate-400", icon: HelpCircle },
}

export function LicenseComplianceCard({ data }: { data: LicenseResult }) {
  const hasIssues = data.strong_copyleft_count > 0 || data.weak_copyleft_count > 0 || data.unknown_count > 0
  const borderColor = data.strong_copyleft_count > 0
    ? "border-red-500/30"
    : data.weak_copyleft_count > 0
      ? "border-amber-500/30"
      : "border-[#1e2a4a]"

  return (
    <Card className={`${borderColor} bg-[#131b2e]`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-purple-400" />
          <CardTitle className="text-sm text-purple-300">License Compliance</CardTitle>
          <Badge className="ml-auto text-xs border-0 bg-purple-500/20 text-purple-400">
            {data.total_packages} package{data.total_packages !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardDescription className="text-[#5a6480]">
          Dependency license risk analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* License distribution */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Permissive", count: data.permissive_count, color: "text-green-400" },
            { label: "Weak Copyleft", count: data.weak_copyleft_count, color: "text-amber-400" },
            { label: "Strong Copyleft", count: data.strong_copyleft_count, color: "text-red-400" },
            { label: "Unknown", count: data.unknown_count, color: "text-slate-400" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] text-[#5a6480]">{item.label}</p>
              <p className={`font-mono text-lg font-bold ${item.color}`}>{item.count}</p>
            </div>
          ))}
        </div>

        {/* Progress bar showing distribution */}
        {data.total_packages > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden mb-4 bg-[#0c1322]">
            {data.permissive_count > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(data.permissive_count / data.total_packages) * 100}%` }}
              />
            )}
            {data.weak_copyleft_count > 0 && (
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${(data.weak_copyleft_count / data.total_packages) * 100}%` }}
              />
            )}
            {data.strong_copyleft_count > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(data.strong_copyleft_count / data.total_packages) * 100}%` }}
              />
            )}
            {data.unknown_count > 0 && (
              <div
                className="bg-slate-500 transition-all"
                style={{ width: `${(data.unknown_count / data.total_packages) * 100}%` }}
              />
            )}
          </div>
        )}

        {/* Non-permissive findings */}
        {hasIssues && data.findings.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.findings.map((finding, idx) => {
              const style = RISK_STYLES[finding.risk] ?? RISK_STYLES.unknown
              const Icon = style.icon
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[#0c1322] border border-[#1e2a4a]"
                >
                  <Icon className={`h-3.5 w-3.5 ${style.text}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {finding.package_name}
                      <span className="text-[#5a6480] font-normal ml-1">@{finding.version}</span>
                    </p>
                  </div>
                  <Badge className={`text-[10px] border-0 shrink-0 ${style.bg} ${style.text}`}>
                    {finding.license}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}

        {!hasIssues && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <p className="text-sm text-green-300">All dependencies use permissive licenses</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
