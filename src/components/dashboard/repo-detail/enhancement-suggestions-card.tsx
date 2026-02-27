"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface EnhancementStats {
  high_impact: number
  medium_impact: number
  low_impact: number
  total_suggestions: number
}

export function EnhancementSuggestionsCard({ enhancements }: { enhancements: EnhancementStats }) {
  return (
    <Card className="border-[#1e2a4a] bg-[#131b2e]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <CardTitle className="text-sm text-purple-300">Enhancement Suggestions</CardTitle>
          <Badge className="ml-auto text-xs bg-purple-500/20 text-purple-300 border-0">
            {enhancements.total_suggestions} suggestion{enhancements.total_suggestions !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardDescription className="text-[#5a6480]">
          Modernization, performance, and best practice opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center rounded-lg bg-red-500/10 border border-red-500/20 py-3">
            <p className="font-mono text-2xl font-bold text-red-400">{enhancements.high_impact}</p>
            <p className="text-xs text-[#8892b0] mt-1">High Impact</p>
          </div>
          <div className="text-center rounded-lg bg-amber-500/10 border border-amber-500/20 py-3">
            <p className="font-mono text-2xl font-bold text-amber-400">{enhancements.medium_impact}</p>
            <p className="text-xs text-[#8892b0] mt-1">Medium Impact</p>
          </div>
          <div className="text-center rounded-lg bg-blue-500/10 border border-blue-500/20 py-3">
            <p className="font-mono text-2xl font-bold text-blue-400">{enhancements.low_impact}</p>
            <p className="text-xs text-[#8892b0] mt-1">Low Impact</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
