"use client"

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'

interface OnboardingStep {
  key: string
  title: string
  description: string
  category: string
  estimatedMinutes: number
  helpUrl: string
  status: 'pending' | 'completed' | 'skipped'
  completedAt: string | null
}

interface OnboardingProgress {
  accountId: string
  type: string
  completedSteps: number
  totalSteps: number
  percentComplete: number
  steps: OnboardingStep[]
  startedAt: string
  completedAt: string | null
  autoDetectedSteps: string[]
}

const categoryIcons: Record<string, React.ReactNode> = {
  setup: <Settings className="w-5 h-5" />,
  data: <Upload className="w-5 h-5" />,
  engagement: <MessageSquare className="w-5 h-5" />,
  growth: <Rocket className="w-5 h-5" />,
}

const categoryColors: Record<string, string> = {
  setup: 'text-blue-400 bg-blue-500/10',
  data: 'text-emerald-400 bg-emerald-500/10',
  engagement: 'text-amber-400 bg-amber-500/10',
  growth: 'text-purple-400 bg-purple-500/10',
}

export default function GettingStartedPage() {
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
        const data = await res.json()
        setProgress(prev => prev ? { ...prev, ...data } : prev)
        fetchProgress()
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
        const data = await res.json()
        setProgress(prev => prev ? { ...prev, ...data } : prev)
        fetchProgress()
      }
    } catch (err) {
      console.error('Failed to skip step:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-800 rounded w-64" />
          <div className="h-4 bg-neutral-800 rounded w-full" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-neutral-800 rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  const isComplete = progress && progress.percentComplete === 100

  // Group steps by category
  const categories = progress ? Array.from(new Set(progress.steps.map(s => s.category))) : []

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Getting Started</h1>
        <p className="text-neutral-400 mt-1">Complete these steps to get the most from your Business Growth Engine</p>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {isComplete ? (
                <PartyPopper className="w-6 h-6 text-amber-400" />
              ) : (
                <Rocket className="w-6 h-6 text-primary-400" />
              )}
              <div>
                <div className="text-lg font-semibold text-white">
                  {isComplete ? 'All done! You are ready to grow.' : `${progress.completedSteps} of ${progress.totalSteps} steps complete`}
                </div>
                <div className="text-sm text-neutral-400">
                  {isComplete
                    ? 'You have completed all onboarding steps'
                    : `About ${progress.steps.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.estimatedMinutes, 0)} minutes remaining`}
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{progress.percentComplete}%</div>
          </div>
          <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Completion Celebration */}
      {isComplete && (
        <div className="bg-gradient-to-r from-primary-500/10 to-amber-500/10 rounded-xl border border-primary-500/20 p-6 text-center">
          <PartyPopper className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Congratulations!</h2>
          <p className="text-neutral-300 mb-4">Your Business Growth Engine is fully set up. Here are some next steps:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/campaigns" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors">
              Launch a Campaign
            </a>
            <a href="/success-metrics" className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors">
              View Success Metrics
            </a>
            <a href="/help" className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors">
              Explore Features
            </a>
          </div>
        </div>
      )}

      {/* Steps by Category */}
      {progress && categories.map(category => {
        const categorySteps = progress.steps.filter(s => s.category === category)
        const completedInCategory = categorySteps.filter(s => s.status === 'completed').length
        const iconClass = categoryColors[category] || 'text-neutral-400 bg-neutral-500/10'

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${iconClass}`}>
                {categoryIcons[category] || <Star className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white capitalize">{category}</h2>
                <p className="text-xs text-neutral-500">{completedInCategory}/{categorySteps.length} complete</p>
              </div>
            </div>

            <div className="space-y-2 ml-2">
              {categorySteps.map(step => (
                <div
                  key={step.key}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    step.status === 'completed'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : step.status === 'skipped'
                      ? 'bg-neutral-900/50 border-neutral-800/50 opacity-60'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : step.status === 'skipped' ? (
                      <SkipForward className="w-6 h-6 text-neutral-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-neutral-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        step.status === 'completed' ? 'text-emerald-300 line-through' :
                        step.status === 'skipped' ? 'text-neutral-500 line-through' :
                        'text-white'
                      }`}>
                        {step.title}
                      </span>
                      {step.status === 'pending' && (
                        <span className="flex items-center gap-1 text-xs text-neutral-500">
                          <Clock className="w-3 h-3" />
                          {step.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 mt-0.5">{step.description}</p>
                  </div>

                  {/* Actions */}
                  {step.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSkip(step.key)}
                        disabled={actionLoading === step.key}
                        className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        Skip
                      </button>
                      <a
                        href={step.helpUrl}
                        className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-colors"
                      >
                        Guide
                      </a>
                      <button
                        onClick={() => handleComplete(step.key)}
                        disabled={actionLoading === step.key}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors disabled:opacity-50"
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
                    <span className="text-xs text-neutral-600 flex-shrink-0">
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