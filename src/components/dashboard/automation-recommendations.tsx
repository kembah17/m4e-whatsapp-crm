'use client'

import { useState, useMemo } from 'react'
import { Lightbulb, ArrowRight, Lock, Sparkles, TrendingUp, Zap, BarChart3, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import {
  getRecommendations,
  requiresUpgrade,
  getProgress,
  type Tier,
  type RecommendationCategory,
  type AutomationRecommendation,
} from '@/lib/recommendations/automation-recommender'

const CATEGORY_ICONS: Record<RecommendationCategory, typeof Zap> = {
  messaging: Zap,
  automation: Sparkles,
  analytics: BarChart3,
  engagement: Users,
  ai: Sparkles,
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  messaging: 'Messaging',
  automation: 'Automation',
  analytics: 'Analytics',
  engagement: 'Engagement',
  ai: 'AI',
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-green-500/10 text-green-500 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-muted text-muted-foreground border-border',
}

const EFFORT_COLORS: Record<string, string> = {
  easy: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  moderate: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  advanced: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
}

const TIER_LABELS: Record<Tier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
}

interface AutomationRecommendationsProps {
  currentTier?: Tier
  activeAutomationIds?: string[]
}

export function AutomationRecommendations({
  currentTier = 'starter',
  activeAutomationIds = [],
}: AutomationRecommendationsProps) {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showAll, setShowAll] = useState(false)

  const allRecs = useMemo(
    () =>
      getRecommendations({
        currentTier,
        activeIds: activeAutomationIds,
      }),
    [currentTier, activeAutomationIds]
  )

  const filtered = useMemo(() => {
    let recs = allRecs
    if (activeCategory !== 'all') {
      recs = recs.filter((r) => r.category === activeCategory)
    }
    return showAll ? recs : recs.slice(0, 5)
  }, [allRecs, activeCategory, showAll])

  const progress = getProgress(activeAutomationIds, currentTier)

  const handleSetup = (rec: AutomationRecommendation) => {
    if (rec.setupRoute) {
      router.push(rec.setupRoute)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-foreground">Recommended Automations</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>
            {progress.active} of {progress.total} active ({progress.percentage}%)
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Recommendation cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((rec) => {
          const needsUpgrade = requiresUpgrade(rec, currentTier)
          const CategoryIcon = CATEGORY_ICONS[rec.category] || Sparkles

          return (
            <Card
              key={rec.id}
              className={`relative flex flex-col gap-3 p-4 transition-colors ${
                rec.isActive ? 'border-primary/30 bg-primary/5' : 'hover:border-border/80'
              } ${needsUpgrade ? 'opacity-75' : ''}`}
            >
              {/* Top row: icon + badges */}
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <CategoryIcon className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex gap-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${IMPACT_COLORS[rec.impact]}`}
                  >
                    {rec.impact} impact
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${EFFORT_COLORS[rec.effort]}`}
                  >
                    {rec.effort}
                  </Badge>
                </div>
              </div>

              {/* Title + description */}
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">{rec.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {rec.description}
                </p>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between">
                {rec.isActive ? (
                  <Badge variant="secondary" className="text-[10px] text-green-500">
                    Active
                  </Badge>
                ) : needsUpgrade ? (
                  <Badge variant="outline" className="text-[10px]">
                    <Lock className="mr-1 h-2.5 w-2.5" />
                    {TIER_LABELS[rec.tier]}
                  </Badge>
                ) : (
                  <span />
                )}
                {!rec.isActive && rec.setupRoute && (
                  <Button
                    size="sm"
                    variant={needsUpgrade ? 'outline' : 'default'}
                    className="h-7 text-xs"
                    onClick={() => handleSetup(rec)}
                  >
                    {needsUpgrade ? 'Upgrade' : 'Set Up'}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Show more/less */}
      {allRecs.length > 5 && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-muted-foreground"
          >
            {showAll ? 'Show less' : `Show all ${allRecs.length} recommendations`}
          </Button>
        </div>
      )}
    </div>
  )
}
