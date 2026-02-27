"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircleIcon, AlertTriangleIcon, XCircle, Info } from "lucide-react"

interface CodeQualityStats {
  worst_grade: string
  total_errors: number
  total_warnings: number
  total_infos: number
  total_findings: number
}

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
  B: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  C: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30" },
  D: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30" },
  F: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
}

const GRADE_LABELS: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Poor",
  F: "Critical",
}

export function CodeQualityCard({ codeQuality }: { codeQuality: CodeQualityStats }) {
  const grade = codeQuality.worst_grade
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS.C
  const label = GRADE_LABELS[grade] ?? "Unknown"

  return (
    <Card className="border-[#1e2a4a] bg-[#131b2e]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 text-blue-400" />
          <CardTitle className="text-sm text-blue-300">Code Quality</CardTitle>
          <Badge className={`ml-auto text-xs border-0 ${colors.bg} ${colors.text}`}>
            {codeQuality.total_findings} finding{codeQuality.total_findings !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardDescription className="text-[#5a6480]">
          Worst file grade across the repository
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Grade badge */}
          <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border ${colors.bg} ${colors.border}`}>
            <span className={`text-3xl font-bold ${colors.text}`}>{grade}</span>
            <span className={`text-[10px] font-medium ${colors.text} opacity-80`}>{label}</span>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <XCircle className="h-3 w-3 text-red-400" />
                <p className="text-xs text-[#5a6480]">Errors</p>
              </div>
              <p className="font-mono text-xl font-bold text-red-400">{codeQuality.total_errors}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangleIcon className="h-3 w-3 text-amber-400" />
                <p className="text-xs text-[#5a6480]">Warnings</p>
              </div>
              <p className="font-mono text-xl font-bold text-amber-400">{codeQuality.total_warnings}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Info className="h-3 w-3 text-blue-400" />
                <p className="text-xs text-[#5a6480]">Info</p>
              </div>
              <p className="font-mono text-xl font-bold text-blue-400">{codeQuality.total_infos}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
