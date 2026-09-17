"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  Circle,
  SkipForward,
  ChevronRight,
  Users,
  MessageSquare,
  Zap,
  BarChart3,
  Settings,
  Upload,
  Rocket,
  PartyPopper,
  ArrowRight,
  RefreshCw,
  Clock,
  Star,
  ExternalLink,
} from 'lucide-react'

// ── Types aligned with backend EnrichedStep ──────────────────
interface OnboardingStep {
  key: string
  title: string
  description: string
  category: 'setup' | 'data' | 'engagement' | 'growth'
  estimatedMinutes: number
  helpUrl: string
  targetPath: string
  status: 'pending' | 'completed' | 'skipped'
  completedAt: string | null
}

interface OnboardingProgress {
  id: string
  accountId: string
  onboardingType: string
  currentStep: number
  totalSteps: number
  stepsCompleted: { key: string; completedAt: string }[]
  isComplete: boolean
  completedAt: string | null
  skippedSteps: string[]
  timeSpentMinutes: number
  percentComplete: number
  steps: OnboardingStep[]
  autoDetectedSteps: string[]
  onboarding_completed: boolean
}

// ── Category display config ──────────────────────────────────
const categoryMeta: Record<string, {
  label: string
  icon: React.ReactNode
  color: string
  description: string
}> = {
  setup: {
    label: 'Setup',
    icon: <Settings className="w-5 h-5" />,
    color: 'text-blue-400 bg-blue-500/10',
    description: 'Configure your account and connect services',
  },
  data: {
    label: 'Data',
    icon: <Upload className="w-5 h-5" />,
    color: 'text-emerald-400 bg-emerald-500/10',
    description: 'Import your business data to get started',
  },
  engagement: {
    label: 'Engagement',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-amber-400 bg-amber-500/10',
    description: 'Start connecting with your customers',
  },
  growth: {
    label: 'Growth',
    icon: <Rocket className="w-5 h-5" />,
    color: 'text-purple-400 bg-purple-500/10',
    description: 'Launch campaigns and automate your growth',
  },
}

export default function GettingStartedPage() {
  const router = useRouter()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding')
      if (res.ok) {
        const data = await res.json()
        setProgress(data)
      }
    } catch (err) {
      console.error('Failed to fetch onboarding:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProgress() }, [fetchProgress])

  const handleComplete = async (stepKey: string) => {
    setActionLoading(stepKey)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', stepKey }),
      })
      if (res.ok) {
        await fetchProgress()
      }
    } catch (err) {
      console.error('Failed to complete step:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSkip = async (stepKey: string) => {
    setActionLoading(stepKey)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip', stepKey }),
      })
      if (res.ok) {
        await fetchProgress()
      }
    } catch (err) {
      console.error('Failed to skip step:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleNavigate = (step: OnboardingStep) => {
    if (step.targetPath && step.targetPath !== '/getting-started') {
      router.push(step.targetPath)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!progress || !progress.steps || progress.steps.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <Rocket className="w-12 h-12 text-primary-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Setting up your onboarding...</h2>
          <p className="text-muted-foreground mb-4">We&apos;re preparing your personalised getting started guide.</p>
          <button
            onClick={() => { setLoading(true); fetchProgress() }}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const isComplete = progress.percentComplete === 100
  const completedCount = progress.steps.filter(s => s.status === 'completed').length
  const pendingSteps = progress.steps.filter(s => s.status === 'pending')
  const remainingMinutes = pendingSteps.reduce((sum, s) => sum + s.estimatedMinutes, 0)

  // Group steps by category, preserving order
  const categoryOrder: string[] = []
  const categoryMap = new Map<string, OnboardingStep[]>()
  for (const step of progress.steps) {
    if (!categoryMap.has(step.category)) {
      categoryOrder.push(step.category)
      categoryMap.set(step.category, [])
    }
    categoryMap.get(step.category)!.push(step)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Getting Started</h1>
        <p className="text-muted-foreground mt-1">Complete these steps to get the most from your Business Growth Engine</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <PartyPopper className="w-6 h-6 text-amber-400" />
            ) : (
              <Rocket className="w-6 h-6 text-primary-400" />
            )}
            <div>
              <div className="text-lg font-semibold text-foreground">
                {isComplete ? 'All done! You\'re ready to grow.' : `${completedCount} of ${progress.totalSteps} steps complete`}
              </div>
              <div className="text-sm text-muted-foreground">
                {isComplete
                  ? 'You have completed all onboarding steps'
                  : `About ${remainingMinutes} minutes remaining`}
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{progress.percentComplete}%</div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>

        {/* Auto-detected hint */}
        {progress.autoDetectedSteps && progress.autoDetectedSteps.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            <CheckCircle className="w-3 h-3 inline mr-1 text-emerald-400" />
            {progress.autoDetectedSteps.length} step{progress.autoDetectedSteps.length > 1 ? 's' : ''} auto-detected from your activity
          </p>
        )}
      </div>

      {/* Completion Celebration */}
      {isComplete && (
        <div className="bg-gradient-to-r from-primary-500/10 to-amber-500/10 rounded-xl border border-primary-500/20 p-6 text-center">
          <PartyPopper className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">Congratulations!</h2>
          <p className="text-muted-foreground mb-4">Your Business Growth Engine is fully set up. Here are some next steps:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/campaigns" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-primary-foreground rounded-lg text-sm font-medium transition-colors">
              Launch a Campaign
            </a>
            <a href="/success-metrics" className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-medium transition-colors">
              View Success Metrics
            </a>
            <a href="/help" className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-medium transition-colors">
              Explore Features
            </a>
          </div>
        </div>
      )}

      {/* Steps by Category */}
      {categoryOrder.map(category => {
        const steps = categoryMap.get(category)!
        const meta = categoryMeta[category] || {
          label: category,
          icon: <Star className="w-5 h-5" />,
          color: 'text-muted-foreground bg-muted/50',
          description: '',
        }
        const completedInCategory = steps.filter(s => s.status === 'completed').length

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${meta.color}`}>
                {meta.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{meta.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {completedInCategory}/{steps.length} complete
                  {meta.description && ` — ${meta.description}`}
                </p>
              </div>
            </div>

            <div className="space-y-2 ml-2">
              {steps.map(step => (
                <div
                  key={step.key}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    step.status === 'completed'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : step.status === 'skipped'
                      ? 'bg-card/50 border-border/50 opacity-60'
                      : 'bg-card border-border hover:border-primary-500/30'
                  }`}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : step.status === 'skipped' ? (
                      <SkipForward className="w-6 h-6 text-muted-foreground" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        step.status === 'completed' ? 'text-emerald-300 line-through' :
                        step.status === 'skipped' ? 'text-muted-foreground line-through' :
                        'text-foreground'
                      }`}>
                        {step.title}
                      </span>
                      {step.status === 'pending' && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {step.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                  </div>

                  {/* Actions */}
                  {step.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSkip(step.key)}
                        disabled={actionLoading === step.key}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Skip
                      </button>
                      {step.targetPath && step.targetPath !== '/getting-started' && (
                        <button
                          onClick={() => handleNavigate(step)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-muted hover:bg-accent text-foreground rounded-md transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Go
                        </button>
                      )}
                      <button
                        onClick={() => handleComplete(step.key)}
                        disabled={actionLoading === step.key}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-500 hover:bg-primary-600 text-primary-foreground rounded-md transition-colors disabled:opacity-50"
                      >
                        {actionLoading === step.key ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Done
                      </button>
                    </div>
                  )}

                  {step.status === 'completed' && step.completedAt && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(step.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
