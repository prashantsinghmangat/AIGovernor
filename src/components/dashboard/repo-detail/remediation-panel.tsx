"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Wrench,
  ChevronDown,
  ChevronRight,
  PackageIcon,
  ShieldAlertIcon,
  CheckCircleIcon,
  Sparkles,
  ExternalLinkIcon,
  Copy,
} from "lucide-react"
import { toast } from "sonner"

// --- Types for each finding source ---

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
  ecosystem?: string
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
  file_path?: string
}

interface QualityFinding {
  id: string
  severity: string
  category: string
  title: string
  description: string
  suggestion: string
  line?: number
  file_path?: string
}

interface EnhancementSuggestion {
  id: string
  category: string
  impact: string
  title: string
  description: string
  recommendation: string
  link?: string
  line?: number
  file_path?: string
}

// --- Unified remediation item ---

interface RemediationItem {
  source: "dependency" | "vulnerability" | "quality" | "enhancement"
  priority: "critical" | "high" | "medium" | "low"
  title: string
  description: string
  fix: string
  fixCommand?: string
  externalUrl?: string
  cwe?: string
  file_path?: string
  line?: number
  id: string
}

// --- Severity helpers ---

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/30 text-red-300",
  high: "bg-orange-500/10 border-orange-500/30 text-orange-300",
  medium: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  low: "bg-blue-500/10 border-blue-500/30 text-blue-300",
}

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/30 text-red-300",
  high: "bg-orange-500/30 text-orange-300",
  medium: "bg-amber-500/30 text-amber-300",
  low: "bg-blue-500/30 text-blue-300",
}

const SOURCE_ICONS: Record<string, typeof PackageIcon> = {
  dependency: PackageIcon,
  vulnerability: ShieldAlertIcon,
  quality: CheckCircleIcon,
  enhancement: Sparkles,
}

const SOURCE_LABELS: Record<string, string> = {
  dependency: "DEP",
  vulnerability: "SEC",
  quality: "CQ",
  enhancement: "ENH",
}

// --- Grouping ---

const URGENCY_GROUPS = [
  { key: "fix-now", label: "Fix Now", priorities: ["critical", "high"], description: "Critical and high-severity issues requiring immediate attention" },
  { key: "fix-sprint", label: "Fix This Sprint", priorities: ["medium"], description: "Medium-severity issues to address in the current sprint" },
  { key: "backlog", label: "Backlog", priorities: ["low"], description: "Low-priority improvements and enhancement suggestions" },
]

// --- Transform functions ---

function fromDepVulns(findings: DepVulnFinding[]): RemediationItem[] {
  return findings.map((f) => {
    const fixCommand = f.patched_version
      ? `npm install ${f.package_name}@${f.patched_version}`
      : undefined
    const externalUrl = f.url
      ?? (f.ghsa ? `https://github.com/advisories/${f.ghsa}` : undefined)
      ?? (f.cve ? `https://nvd.nist.gov/vuln/detail/${f.cve}` : undefined)
    return {
      source: "dependency" as const,
      priority: (f.severity as RemediationItem["priority"]) ?? "medium",
      title: `${f.package_name}@${f.installed_version} — ${f.title}`,
      description: f.description,
      fix: f.patched_version
        ? `Upgrade to ${f.package_name}@${f.patched_version}`
        : "No patch available. Consider replacing this package.",
      fixCommand,
      externalUrl,
      id: f.id,
    }
  })
}

function fromCodeVulns(findings: VulnFinding[], filePath?: string): RemediationItem[] {
  return findings.map((f) => {
    const cweUrl = f.cwe
      ? `https://cwe.mitre.org/data/definitions/${f.cwe.replace("CWE-", "")}.html`
      : undefined
    return {
      source: "vulnerability" as const,
      priority: (f.severity as RemediationItem["priority"]) ?? "medium",
      title: f.title,
      description: f.description,
      fix: f.description,
      externalUrl: cweUrl,
      cwe: f.cwe,
      file_path: f.file_path ?? filePath,
      line: f.line,
      id: `${f.id}-${f.line}`,
    }
  })
}

function fromQualityFindings(findings: QualityFinding[], filePath?: string): RemediationItem[] {
  return findings.map((f) => ({
    source: "quality" as const,
    priority: f.severity === "error" ? "medium" as const : "low" as const,
    title: f.title,
    description: f.description,
    fix: f.suggestion,
    file_path: f.file_path ?? filePath,
    line: f.line,
    id: `${f.id}-${f.line ?? 0}`,
  }))
}

function fromEnhancements(suggestions: EnhancementSuggestion[], filePath?: string): RemediationItem[] {
  return suggestions.map((s) => ({
    source: "enhancement" as const,
    priority: s.impact === "high" ? "medium" as const : "low" as const,
    title: s.title,
    description: s.description,
    fix: s.recommendation,
    externalUrl: s.link,
    file_path: s.file_path ?? filePath,
    line: s.line,
    id: `${s.id}-${s.line ?? 0}`,
  }))
}

// --- Component ---

interface RemediationPanelProps {
  depVulnFindings?: DepVulnFinding[]
  codeVulnFindings?: VulnFinding[]
  qualityFindings?: QualityFinding[]
  enhancementSuggestions?: EnhancementSuggestion[]
}

export function RemediationPanel({
  depVulnFindings = [],
  codeVulnFindings = [],
  qualityFindings = [],
  enhancementSuggestions = [],
}: RemediationPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["fix-now"]))

  // Build unified list
  const items: RemediationItem[] = [
    ...fromDepVulns(depVulnFindings),
    ...fromCodeVulns(codeVulnFindings),
    ...fromQualityFindings(qualityFindings),
    ...fromEnhancements(enhancementSuggestions),
  ].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))

  if (items.length === 0) return null

  const counts = {
    critical: items.filter((i) => i.priority === "critical").length,
    high: items.filter((i) => i.priority === "high").length,
    medium: items.filter((i) => i.priority === "medium").length,
    low: items.filter((i) => i.priority === "low").length,
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    toast.success("Copied to clipboard")
  }

  return (
    <Card className="border-emerald-500/20 bg-[#131b2e]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-emerald-400" />
          <CardTitle className="text-sm text-emerald-300">Remediation Guide</CardTitle>
          <Badge className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 border-0">
            {items.length} action{items.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardDescription className="text-[#5a6480]">
          Actionable fix guidance for all detected issues, prioritized by urgency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary counts */}
        <div className="grid grid-cols-4 gap-3">
          {(["critical", "high", "medium", "low"] as const).map((p) => (
            <div key={p} className={`text-center rounded-lg border py-2 ${PRIORITY_COLORS[p]}`}>
              <p className="font-mono text-xl font-bold">{counts[p]}</p>
              <p className="text-[10px] uppercase font-medium opacity-80">{p}</p>
            </div>
          ))}
        </div>

        {/* Grouped items */}
        {URGENCY_GROUPS.map((group) => {
          const groupItems = items.filter((i) => group.priorities.includes(i.priority))
          if (groupItems.length === 0) return null
          const isExpanded = expandedGroups.has(group.key)

          return (
            <div key={group.key} className="rounded-lg border border-[#1e2a4a] overflow-hidden">
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-[#0d1321] hover:bg-[#111827] transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[#5a6480]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#5a6480]" />
                )}
                <span className="text-sm font-medium text-white">{group.label}</span>
                <span className="text-xs text-[#5a6480]">({groupItems.length})</span>
                <span className="text-xs text-[#5a6480] ml-auto">{group.description}</span>
              </button>

              {isExpanded && (
                <div className="divide-y divide-[#1e2a4a]">
                  {groupItems.map((item) => {
                    const SourceIcon = SOURCE_ICONS[item.source]
                    return (
                      <div key={item.id} className="px-4 py-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_BADGE[item.priority]}`}>
                            {item.priority}
                          </span>
                          <SourceIcon className="h-3.5 w-3.5 mt-0.5 text-[#5a6480] shrink-0" />
                          <span className="text-[10px] font-bold uppercase text-[#5a6480]">
                            {SOURCE_LABELS[item.source]}
                          </span>
                          <span className="text-sm text-white font-medium flex-1">{item.title}</span>
                          {item.cwe && (
                            <span className="text-[10px] font-mono text-[#5a6480]">{item.cwe}</span>
                          )}
                        </div>

                        {/* Fix guidance */}
                        <div className="ml-6 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2">
                          <p className="text-xs text-emerald-300/90">{item.fix}</p>
                          {item.fixCommand && (
                            <div className="mt-2 flex items-center gap-2">
                              <code className="flex-1 text-xs font-mono bg-black/30 rounded px-2 py-1 text-emerald-200">
                                {item.fixCommand}
                              </code>
                              <button
                                onClick={() => copyCommand(item.fixCommand!)}
                                className="text-[#5a6480] hover:text-emerald-400 transition-colors"
                                title="Copy command"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Location + links */}
                        <div className="ml-6 flex items-center gap-3 text-[10px] text-[#5a6480]">
                          {item.file_path && (
                            <span className="font-mono">
                              {item.file_path}{item.line ? `:${item.line}` : ""}
                            </span>
                          )}
                          {item.externalUrl && (
                            <a
                              href={item.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLinkIcon className="h-3 w-3" />
                              Learn more
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
