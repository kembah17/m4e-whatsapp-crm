"use client"

import { useState, useCallback } from "react"
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
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Beaker,
  Target,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Brain,
  Zap,
  BarChart3,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatternSuggestion {
  pattern_id: string
  pattern_type: string
  name: string
  description: string
  effectiveness_score: number
  confidence: "high" | "medium" | "low"
  trend: "emerging" | "rising" | "stable" | "declining" | "unknown"
  recommendation: string
  is_anti_pattern: boolean
  evidence_count: number
  industry_match: boolean
}

interface Hypothesis {
  id: string
  statement: string
  rationale: string
  test_method: string
  success_criteria: string
  confidence_score: number
  expected_impact: "high" | "medium" | "low"
  supporting_patterns: string[]
  status: "proposed" | "testing" | "validated" | "rejected"
}

interface RuleViolation {
  rule_id: string
  rule_name: string
  severity: "critical" | "high" | "medium" | "low"
  message: string
  field?: string
  suggestion?: string
}

interface PatternInsightsPanelProps {
  campaignId: string
  campaignStatus: string
  industry?: string
  channel?: string
  category?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONFIDENCE_CONFIG = {
  high: { label: "High", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "Medium", color: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "Low", color: "bg-gray-50 text-gray-600 border-gray-200" },
}

const TREND_CONFIG = {
  emerging: { label: "Emerging", icon: Sparkles, color: "text-purple-600" },
  rising: { label: "Rising", icon: TrendingUp, color: "text-emerald-600" },
  stable: { label: "Stable", icon: Target, color: "text-blue-600" },
  declining: { label: "Declining", icon: TrendingDown, color: "text-red-500" },
  unknown: { label: "Unknown", icon: BarChart3, color: "text-gray-400" },
}

const SEVERITY_CONFIG = {
  critical: { label: "Critical", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  high: { label: "High", color: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertTriangle },
  medium: { label: "Medium", color: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertTriangle },
  low: { label: "Low", color: "bg-blue-50 text-blue-600 border-blue-200", icon: Lightbulb },
}

const IMPACT_CONFIG = {
  high: { label: "High Impact", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "Medium Impact", color: "bg-blue-50 text-blue-700 border-blue-200" },
  low: { label: "Low Impact", color: "bg-gray-50 text-gray-600 border-gray-200" },
}

function scoreColor(score: number): string {
  if (score >= 0.8) return "text-emerald-600"
  if (score >= 0.6) return "text-blue-600"
  if (score >= 0.4) return "text-amber-600"
  return "text-red-500"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatternInsightsPanel({
  campaignId,
  campaignStatus,
  industry,
  channel,
  category,
}: PatternInsightsPanelProps) {
  const [suggestions, setSuggestions] = useState<PatternSuggestion[]>([])
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [violations, setViolations] = useState<RuleViolation[]>([])
  const [loading, setLoading] = useState(false)
  const [hypothesesLoading, setHypothesesLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [activeSection, setActiveSection] = useState<"suggestions" | "hypotheses" | "rules">("suggestions")

  // -----------------------------------------------------------------------
  // Fetch suggestions
  // -----------------------------------------------------------------------

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/suggestions`)
      if (!res.ok) throw new Error("Failed to fetch suggestions")
      const data = await res.json()
      setSuggestions(data.suggestions ?? [])
      setViolations(data.violations ?? [])
      setLoaded(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load insights"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  // -----------------------------------------------------------------------
  // Fetch hypotheses
  // -----------------------------------------------------------------------

  const fetchHypotheses = useCallback(async () => {
    try {
      setHypothesesLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/hypotheses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, channel, category }),
      })
      if (!res.ok) throw new Error("Failed to generate hypotheses")
      const data = await res.json()
      setHypotheses(data.hypotheses ?? [])
      setActiveSection("hypotheses")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate hypotheses"
      toast.error(message)
    } finally {
      setHypothesesLoading(false)
    }
  }, [campaignId, industry, channel, category])

  // -----------------------------------------------------------------------
  // Extract patterns (completed campaigns)
  // -----------------------------------------------------------------------

  const extractPatterns = useCallback(async () => {
    try {
      setExtracting(true)
      const res = await fetch(`/api/campaigns/${campaignId}/extract-patterns`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to extract patterns")
      const data = await res.json()
      toast.success(
        `Extracted ${data.patterns_created ?? 0} patterns and ${data.learnings_created ?? 0} learnings`
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to extract patterns"
      toast.error(message)
    } finally {
      setExtracting(false)
    }
  }, [campaignId])

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------

  const winningPatterns = suggestions.filter((s) => !s.is_anti_pattern)
  const antiPatterns = suggestions.filter((s) => s.is_anti_pattern)
  const blockingViolations = violations.filter(
    (v) => v.severity === "critical" || v.severity === "high"
  )
  const isCompleted = campaignStatus === "completed"

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Pattern Insights</CardTitle>
            {loaded && suggestions.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] bg-primary/10 text-primary border-primary/30"
              >
                {suggestions.length} patterns
              </Badge>
            )}
            {blockingViolations.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] bg-red-50 text-red-700 border-red-200 gap-1"
              >
                <ShieldAlert className="h-3 w-3" />
                {blockingViolations.length} blockers
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={extractPatterns}
                disabled={extracting}
                className="gap-1.5 text-xs"
              >
                {extracting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Extract Patterns
              </Button>
            )}
            {!loaded && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSuggestions}
                disabled={loading}
                className="gap-1.5 text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lightbulb className="h-3.5 w-3.5" />
                )}
                Load Insights
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
        {expanded && !loaded && (
          <p className="text-sm text-muted-foreground mt-1">
            Load pattern insights to see what has worked in similar campaigns and get
            evidence-based suggestions.
          </p>
        )}
      </CardHeader>

      {expanded && loaded && (
        <CardContent className="pt-0 space-y-4">
          {/* Section tabs */}
          <div className="flex gap-1 border-b border-border pb-2">
            <Button
              variant={activeSection === "suggestions" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("suggestions")}
              className="gap-1.5 text-xs h-7"
            >
              <Lightbulb className="h-3 w-3" />
              Patterns ({suggestions.length})
            </Button>
            <Button
              variant={activeSection === "hypotheses" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveSection("hypotheses")
                if (hypotheses.length === 0 && !hypothesesLoading) fetchHypotheses()
              }}
              className="gap-1.5 text-xs h-7"
            >
              <Beaker className="h-3 w-3" />
              Hypotheses ({hypotheses.length})
            </Button>
            <Button
              variant={activeSection === "rules" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("rules")}
              className="gap-1.5 text-xs h-7"
            >
              <ShieldAlert className="h-3 w-3" />
              Rules ({violations.length})
            </Button>
          </div>

          {/* Suggestions section */}
          {activeSection === "suggestions" && (
            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Lightbulb className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No pattern data available yet. Run more campaigns to build your pattern library.
                  </p>
                </div>
              ) : (
                <>
                  {/* Winning patterns */}
                  {winningPatterns.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Winning Patterns
                      </h4>
                      {winningPatterns.map((pattern) => {
                        const trendCfg = TREND_CONFIG[pattern.trend]
                        const TrendIcon = trendCfg.icon
                        const confCfg = CONFIDENCE_CONFIG[pattern.confidence]
                        return (
                          <div
                            key={pattern.pattern_id}
                            className="rounded-lg border bg-card p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                  {pattern.pattern_type}
                                </Badge>
                                <span className="text-sm font-medium">{pattern.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <TrendIcon className={cn("h-3.5 w-3.5", trendCfg.color)} />
                                <span className={cn("text-xs font-semibold", scoreColor(pattern.effectiveness_score))}>
                                  {(pattern.effectiveness_score * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{pattern.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[10px]", confCfg.color)}>
                                {confCfg.label} confidence
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {pattern.evidence_count} evidence points
                              </span>
                              {pattern.industry_match && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                                  Industry match
                                </Badge>
                              )}
                            </div>
                            {pattern.recommendation && (
                              <div className="flex items-start gap-1.5 mt-1 px-2 py-1.5 rounded bg-emerald-50 border border-emerald-100">
                                <ArrowRight className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                                <span className="text-xs text-emerald-700">{pattern.recommendation}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Anti-patterns */}
                  {antiPatterns.length > 0 && (
                    <div className="space-y-2">
                      <Separator />
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        Anti-Patterns (Avoid)
                      </h4>
                      {antiPatterns.map((pattern) => (
                        <div
                          key={pattern.pattern_id}
                          className="rounded-lg border border-red-100 bg-red-50/50 p-3 space-y-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] capitalize bg-red-50 text-red-600 border-red-200">
                              {pattern.pattern_type}
                            </Badge>
                            <span className="text-sm font-medium text-red-700">{pattern.name}</span>
                          </div>
                          <p className="text-xs text-red-600/80">{pattern.description}</p>
                          {pattern.recommendation && (
                            <p className="text-xs text-red-700 font-medium">
                              ⚠️ {pattern.recommendation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Hypotheses section */}
          {activeSection === "hypotheses" && (
            <div className="space-y-3">
              {hypothesesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Generating hypotheses...</span>
                </div>
              ) : hypotheses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Beaker className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate testable hypotheses based on your pattern library.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchHypotheses}
                    className="gap-1.5"
                  >
                    <Beaker className="h-3.5 w-3.5" />
                    Generate Hypotheses
                  </Button>
                </div>
              ) : (
                hypotheses.map((hypothesis, idx) => {
                  const impactCfg = IMPACT_CONFIG[hypothesis.expected_impact]
                  return (
                    <div
                      key={hypothesis.id}
                      className="rounded-lg border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px]", impactCfg.color)}>
                            {impactCfg.label}
                          </Badge>
                        </div>
                        <span className={cn("text-xs font-semibold", scoreColor(hypothesis.confidence_score))}>
                          {(hypothesis.confidence_score * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm font-medium">{hypothesis.statement}</p>
                      <p className="text-xs text-muted-foreground">{hypothesis.rationale}</p>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Test method:</span>
                          <p className="font-medium mt-0.5">{hypothesis.test_method}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Success criteria:</span>
                          <p className="font-medium mt-0.5">{hypothesis.success_criteria}</p>
                        </div>
                      </div>
                      {hypothesis.supporting_patterns.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {hypothesis.supporting_patterns.map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Rules section */}
          {activeSection === "rules" && (
            <div className="space-y-3">
              {violations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-emerald-700">All rules passed</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No business rule violations detected for this campaign.
                  </p>
                </div>
              ) : (
                violations.map((violation) => {
                  const sevCfg = SEVERITY_CONFIG[violation.severity]
                  const SevIcon = sevCfg.icon
                  return (
                    <div
                      key={violation.rule_id}
                      className={cn(
                        "rounded-lg border p-3 space-y-1.5",
                        violation.severity === "critical" && "border-red-200 bg-red-50/50",
                        violation.severity === "high" && "border-orange-200 bg-orange-50/50",
                        violation.severity === "medium" && "border-amber-200 bg-amber-50/50",
                        violation.severity === "low" && "border-blue-200 bg-blue-50/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <SevIcon className="h-4 w-4" />
                        <Badge variant="outline" className={cn("text-[10px]", sevCfg.color)}>
                          {sevCfg.label}
                        </Badge>
                        <span className="text-sm font-medium">{violation.rule_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{violation.message}</p>
                      {violation.field && (
                        <p className="text-[10px] text-muted-foreground">
                          Field: <code className="bg-muted px-1 rounded">{violation.field}</code>
                        </p>
                      )}
                      {violation.suggestion && (
                        <div className="flex items-start gap-1.5 mt-1 px-2 py-1.5 rounded bg-white/80 border">
                          <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-xs">{violation.suggestion}</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
