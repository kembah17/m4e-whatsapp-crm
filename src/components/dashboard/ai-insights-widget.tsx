"use client"

import { useCallback, useEffect, useState } from 'react'
import { Lightbulb, RefreshCw, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Insight {
  id: string
  category: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

const priorityColor: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
}

const categoryColor: Record<string, string> = {
  sales: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  customers: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  inventory: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  payments: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  engagement: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  seasonal: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
}

export function AIInsightsWidget() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(false)

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/ai/insights?limit=3')
      if (!res.ok) throw new Error('Failed to fetch insights')
      const data = await res.json()
      setInsights((data.insights || []).slice(0, 3))
    } catch (err) {
      console.error('[ai-insights-widget] fetch error:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      const res = await fetch('/api/ai/insights', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate insights')
      const data = await res.json()
      toast.success(`Generated ${data.generated} new insights`)
      await fetchInsights()
    } catch (err) {
      toast.error('Failed to generate insights', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setGenerating(false)
    }
  }

  if (error) return null

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-foreground">AI Insights</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate New'}
          </button>
          <Link
            href="/insights"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-muted h-16" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No insights yet. Click Generate to analyze your business.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="flex items-start gap-3 rounded-lg border bg-background p-3"
            >
              <div
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityColor[insight.priority] || 'bg-gray-400'}`}
                title={`${insight.priority} priority`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor[insight.category] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {insight.category}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground leading-tight">
                  {insight.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
