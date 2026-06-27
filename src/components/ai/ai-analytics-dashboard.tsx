"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, BarChart3, Zap, ArrowUpRight, Target,
  Clock, TrendingUp, Activity, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnalyticsData {
  totalInteractions: number
  autoReplied: number
  handedOff: number
  avgConfidence: number
  avgLatencyMs: number
  topIntents: Array<{ intent: string; count: number }>
  dailyVolume: Array<{ date: string; count: number; auto_replied: number; handed_off: number }>
  confidenceDistribution: Array<{ label: string; count: number }>
  period: { days: number; since: string }
}

export function AIAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/ai/analytics?days=${days}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Failed to load analytics</p>
      </div>
    )
  }

  const autoReplyRate = data.totalInteractions > 0
    ? ((data.autoReplied / data.totalInteractions) * 100).toFixed(1)
    : '0'
  const handoffRate = data.totalInteractions > 0
    ? ((data.handedOff / data.totalInteractions) * 100).toFixed(1)
    : '0'

  const maxDailyCount = Math.max(...data.dailyVolume.map(d => d.count), 1)
  const maxIntentCount = data.topIntents.length > 0 ? data.topIntents[0].count : 1
  const maxConfCount = Math.max(...data.confidenceDistribution.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Period:</span>
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              days === d
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
            )}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Total Interactions"
          value={data.totalInteractions.toLocaleString()}
          color="purple"
        />
        <StatCard
          icon={Zap}
          label="Auto-Reply Rate"
          value={`${autoReplyRate}%`}
          sub={`${data.autoReplied} auto-replied`}
          color="green"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Handoff Rate"
          value={`${handoffRate}%`}
          sub={`${data.handedOff} handed off`}
          color="orange"
        />
        <StatCard
          icon={Target}
          label="Avg Confidence"
          value={`${(data.avgConfidence * 100).toFixed(0)}%`}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Avg Latency"
          value={`${data.avgLatencyMs}ms`}
          color="gray"
        />
      </div>

      {/* Daily Volume Chart */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          Daily Volume
        </h3>
        {data.dailyVolume.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No data for this period</p>
        ) : (
          <div className="space-y-1">
            {data.dailyVolume.map((day) => (
              <div key={day.date} className="flex items-center gap-3 group">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                  {new Date(day.date + 'T00:00:00').toLocaleDateString('en-NG', {
                    month: 'short', day: 'numeric',
                  })}
                </span>
                <div className="flex-1 flex items-center gap-0.5 h-6">
                  {/* Auto-replied portion */}
                  <div
                    className="h-full bg-green-400 rounded-l transition-all"
                    style={{ width: `${(day.auto_replied / maxDailyCount) * 100}%` }}
                    title={`Auto-replied: ${day.auto_replied}`}
                  />
                  {/* Handed off portion */}
                  <div
                    className="h-full bg-orange-400 rounded-r transition-all"
                    style={{ width: `${(day.handed_off / maxDailyCount) * 100}%` }}
                    title={`Handed off: ${day.handed_off}`}
                  />
                  {/* Remaining (logged but not auto-replied or handed off) */}
                  {day.count - day.auto_replied - day.handed_off > 0 && (
                    <div
                      className="h-full bg-gray-200 rounded-r transition-all"
                      style={{ width: `${((day.count - day.auto_replied - day.handed_off) / maxDailyCount) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-400 w-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.count}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-400 rounded" /> Auto-replied
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-400 rounded" /> Handed off
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-gray-200 rounded" /> Other
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Intents */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Top Intents
          </h3>
          {data.topIntents.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No intent data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topIntents.map((item, i) => (
                <div key={item.intent} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.intent}</span>
                      <span className="text-xs text-gray-500">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(item.count / maxIntentCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confidence Distribution */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Confidence Distribution
          </h3>
          {data.confidenceDistribution.every(b => b.count === 0) ? (
            <p className="text-gray-400 text-center py-8">No confidence data yet</p>
          ) : (
            <div className="space-y-3">
              {data.confidenceDistribution.map((bucket) => {
                const colors: Record<string, string> = {
                  '0-0.3': 'bg-red-500',
                  '0.3-0.5': 'bg-orange-500',
                  '0.5-0.7': 'bg-yellow-500',
                  '0.7-0.9': 'bg-green-500',
                  '0.9-1.0': 'bg-emerald-500',
                }
                return (
                  <div key={bucket.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12 font-mono">{bucket.label}</span>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', colors[bucket.label] || 'bg-gray-400')}
                          style={{ width: `${(bucket.count / maxConfCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{bucket.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: 'purple' | 'green' | 'orange' | 'blue' | 'gray'
}) {
  const colorMap = {
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    gray: 'bg-gray-50 text-gray-600',
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorMap[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
