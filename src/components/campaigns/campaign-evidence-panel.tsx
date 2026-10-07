"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  FileSearch,
  Loader2,
  ChevronDown,
  ChevronUp,
  Link2,
  Clock,
  User,
  Database,
  Lightbulb,
  TrendingUp,
  BookOpen,
  ExternalLink,
  Layers,
  GitCommit,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvidenceSource {
  type: "pattern" | "learning" | "research" | "hypothesis" | "manual"
  source_id: string
  name: string
  description: string
  confidence_score: number
  created_at: string
}

interface ProvenanceEntry {
  action: string
  actor: string
  timestamp: string
  details: string
  metadata?: Record<string, unknown>
}

interface CampaignEvidence {
  campaign_id: string
  sources: EvidenceSource[]
  provenance: ProvenanceEntry[]
  summary: string
  total_patterns_used: number
  total_learnings_applied: number
  evidence_strength: "strong" | "moderate" | "weak" | "none"
}

interface CampaignEvidencePanelProps {
  campaignId: string
  autoLoad?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_TYPE_CONFIG = {
  pattern: { label: "Pattern", icon: Layers, color: "bg-purple-50 text-purple-700 border-purple-200" },
  learning: { label: "Learning", icon: BookOpen, color: "bg-blue-50 text-blue-700 border-blue-200" },
  research: { label: "Research", icon: FileSearch, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  hypothesis: { label: "Hypothesis", icon: Lightbulb, color: "bg-amber-50 text-amber-700 border-amber-200" },
  manual: { label: "Manual", icon: User, color: "bg-gray-50 text-gray-600 border-gray-200" },
}

const STRENGTH_CONFIG = {
  strong: { label: "Strong Evidence", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  moderate: { label: "Moderate Evidence", color: "bg-blue-50 text-blue-700 border-blue-200" },
  weak: { label: "Weak Evidence", color: "bg-amber-50 text-amber-700 border-amber-200" },
  none: { label: "No Evidence", color: "bg-gray-50 text-gray-600 border-gray-200" },
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ts
  }
}

function confidenceColor(score: number): string {
  if (score >= 0.8) return "text-emerald-600"
  if (score >= 0.6) return "text-blue-600"
  if (score >= 0.4) return "text-amber-600"
  return "text-red-500"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignEvidencePanel({
  campaignId,
  autoLoad = false,
}: CampaignEvidencePanelProps) {
  const [evidence, setEvidence] = useState<CampaignEvidence | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<"sources" | "provenance">("sources")

  // -----------------------------------------------------------------------
  // Fetch evidence
  // -----------------------------------------------------------------------

  const fetchEvidence = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/evidence`)
      if (!res.ok) throw new Error("Failed to fetch evidence")
      const data = await res.json()
      setEvidence(data.evidence ?? null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load evidence"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    if (autoLoad) fetchEvidence()
  }, [autoLoad, fetchEvidence])

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const hasEvidence = evidence && (evidence.sources.length > 0 || evidence.provenance.length > 0)

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Evidence & Provenance</CardTitle>
            {evidence && (
              <Badge
                variant="outline"
                className={cn("text-[10px]", STRENGTH_CONFIG[evidence.evidence_strength].color)}
              >
                {STRENGTH_CONFIG[evidence.evidence_strength].label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!evidence && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEvidence}
                disabled={loading}
                className="gap-1.5 text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSearch className="h-3.5 w-3.5" />
                )}
                Load Evidence
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {expanded && !evidence && !loading && (
          <p className="text-sm text-muted-foreground mt-1">
            View the evidence chain and provenance for this campaign — what patterns,
            learnings, and research informed its creation.
          </p>
        )}
      </CardHeader>

      {expanded && loading && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading evidence...</span>
          </div>
        </CardContent>
      )}

      {expanded && evidence && (
        <CardContent className="pt-0 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {evidence.total_patterns_used}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Patterns Used</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {evidence.total_learnings_applied}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Learnings Applied</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {evidence.sources.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total Sources</p>
            </div>
          </div>

          {/* Summary text */}
          {evidence.summary && (
            <div className="rounded-lg bg-muted/30 border p-3">
              <p className="text-sm text-muted-foreground">{evidence.summary}</p>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1 border-b border-border pb-2">
            <Button
              variant={activeTab === "sources" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("sources")}
              className="gap-1.5 text-xs h-7"
            >
              <Link2 className="h-3 w-3" />
              Sources ({evidence.sources.length})
            </Button>
            <Button
              variant={activeTab === "provenance" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("provenance")}
              className="gap-1.5 text-xs h-7"
            >
              <GitCommit className="h-3 w-3" />
              Provenance ({evidence.provenance.length})
            </Button>
          </div>

          {/* Sources tab */}
          {activeTab === "sources" && (
            <div className="space-y-2">
              {evidence.sources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Link2 className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No evidence sources recorded for this campaign.
                  </p>
                </div>
              ) : (
                evidence.sources.map((source) => {
                  const typeCfg = SOURCE_TYPE_CONFIG[source.type]
                  const TypeIcon = typeCfg.icon
                  return (
                    <div
                      key={source.source_id}
                      className="rounded-lg border bg-card p-3 space-y-1.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className={cn("text-[10px]", typeCfg.color)}>
                            {typeCfg.label}
                          </Badge>
                          <span className="text-sm font-medium">{source.name}</span>
                        </div>
                        <span className={cn("text-xs font-semibold", confidenceColor(source.confidence_score))}>
                          {(source.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{source.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(source.created_at)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Provenance tab */}
          {activeTab === "provenance" && (
            <div className="space-y-0">
              {evidence.provenance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <GitCommit className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No provenance records for this campaign.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

                  <div className="space-y-3">
                    {evidence.provenance.map((entry, idx) => (
                      <div
                        key={idx}
                        className="relative flex items-start gap-4 pl-1"
                      >
                        {/* Timeline dot */}
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border-2 border-border">
                          <GitCommit className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium">{entry.action}</span>
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <User className="h-2.5 w-2.5" />
                              {entry.actor}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{entry.details}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
