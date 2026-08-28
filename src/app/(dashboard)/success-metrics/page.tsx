"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Users,
  MessageSquare,
  Zap,
  BarChart3,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  CheckCircle,
  Clock,
} from 'lucide-react'

interface HealthScore {
  overallScore: number
  riskLevel: string
  trend: string
  components: {
    login: number
    featureBreadth: number
    contactEngagement: number
    campaignActivity: number
    dataFreshness: number
    supportSentiment: number
  }
  metrics: {
    daysSinceLogin: number | null
    featuresUsed30d: number
    totalFeaturesAvailable: number
    messagesSent30d: number
    contactsTotal: number
    activeCampaigns: number
    daysSinceDataUpdate: number | null
    openTickets: number
  }
}

interface ActivitySummary {
  totalEvents: number
  uniqueFeatures: string[]
  uniquePages: string[]
  loginCount: number
  messagesSent: number
  lastActivity: string | null
  dailyActivity: { date: string; count: number }[]
}

interface HistoryPoint {
  date: string
  score: number
  risk: string
}

export default function SuccessMetricsPage() {
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null)
  const [activity, setActivity] = useState<ActivitySummary | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [scoreRes, activityRes, historyRes] = await Promise.all([
        fetch('/api/health-score'),
        fetch('/api/activity?days=30'),
        fetch('/api/health-score?action=history&days=30'),
      ])

      if (scoreRes.ok) setHealthScore(await scoreRes.json())
      if (activityRes.ok) setActivity(await activityRes.json())
      if (historyRes.ok) {
        const data = await historyRes.json()
        setHistory(data.history || [])
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'healthy': return 'text-emerald-400'
      case 'watch': return 'text-amber-400'
      case 'at_risk': return 'text-orange-400'
      case 'critical': return 'text-red-400'
      default: return 'text-neutral-400'
    }
  }

  const getRiskBg = (risk: string) => {
    switch (risk) {
      case 'healthy': return 'bg-emerald-500/10 border-emerald-500/20'
      case 'watch': return 'bg-amber-500/10 border-amber-500/20'
      case 'at_risk': return 'bg-orange-500/10 border-orange-500/20'
      case 'critical': return 'bg-red-500/10 border-red-500/20'
      default: return 'bg-neutral-500/10 border-neutral-500/20'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'healthy': return <Heart className="w-5 h-5 text-emerald-400" />
      case 'watch': return <AlertTriangle className="w-5 h-5 text-amber-400" />
      case 'at_risk': return <AlertCircle className="w-5 h-5 text-orange-400" />
      case 'critical': return <XCircle className="w-5 h-5 text-red-400" />
      default: return <Activity className="w-5 h-5 text-neutral-400" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-emerald-400" />
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-400" />
      default: return <Minus className="w-4 h-4 text-neutral-400" />
    }
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-500'
    if (score >= 50) return 'bg-amber-500'
    if (score >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-800 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-neutral-800 rounded-lg" />)}
          </div>
          <div className="h-64 bg-neutral-800 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Success Metrics</h1>
          <p className="text-neutral-400 mt-1">Track your platform health and business growth</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Health Score Hero */}
      {healthScore && (
        <div className={`rounded-xl border p-6 ${getRiskBg(healthScore.riskLevel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-white">{healthScore.overallScore}</div>
              <div>
                <div className="flex items-center gap-2">
                  {getRiskIcon(healthScore.riskLevel)}
                  <span className={`text-lg font-semibold capitalize ${getRiskColor(healthScore.riskLevel)}`}>
                    {healthScore.riskLevel.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-neutral-400">
                  {getTrendIcon(healthScore.trend)}
                  <span className="capitalize">{healthScore.trend}</span> over last 30 days
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-neutral-400">
              <div>Health Score</div>
              <div>out of 100</div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      {healthScore && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="w-5 h-5 text-primary-400" />}
            label="Total Contacts"
            value={healthScore.metrics.contactsTotal.toLocaleString()}
          />
          <MetricCard
            icon={<MessageSquare className="w-5 h-5 text-primary-400" />}
            label="Messages (30d)"
            value={healthScore.metrics.messagesSent30d.toLocaleString()}
          />
          <MetricCard
            icon={<Zap className="w-5 h-5 text-primary-400" />}
            label="Active Campaigns"
            value={healthScore.metrics.activeCampaigns.toString()}
          />
          <MetricCard
            icon={<BarChart3 className="w-5 h-5 text-primary-400" />}
            label="Features Used"
            value={`${healthScore.metrics.featuresUsed30d} / ${healthScore.metrics.totalFeaturesAvailable}`}
          />
        </div>
      )}

      {/* Component Scores */}
      {healthScore && (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Score Breakdown</h2>
          <div className="space-y-4">
            <ScoreBar label="Login Frequency" score={healthScore.components.login} weight={25} detail={healthScore.metrics.daysSinceLogin !== null ? `Last login: ${healthScore.metrics.daysSinceLogin} days ago` : 'No login recorded'} />
            <ScoreBar label="Feature Usage" score={healthScore.components.featureBreadth} weight={20} detail={`${healthScore.metrics.featuresUsed30d} of ${healthScore.metrics.totalFeaturesAvailable} features used`} />
            <ScoreBar label="Customer Engagement" score={healthScore.components.contactEngagement} weight={20} detail={`${healthScore.metrics.messagesSent30d} messages to ${healthScore.metrics.contactsTotal} contacts`} />
            <ScoreBar label="Campaign Activity" score={healthScore.components.campaignActivity} weight={15} detail={`${healthScore.metrics.activeCampaigns} active campaigns`} />
            <ScoreBar label="Data Freshness" score={healthScore.components.dataFreshness} weight={10} detail={healthScore.metrics.daysSinceDataUpdate !== null ? `Last update: ${healthScore.metrics.daysSinceDataUpdate} days ago` : 'No data updates'} />
            <ScoreBar label="Support Health" score={healthScore.components.supportSentiment} weight={10} detail={`${healthScore.metrics.openTickets} open tickets`} />
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {activity && activity.dailyActivity.length > 0 && (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Activity (Last 30 Days)</h2>
          <div className="flex items-end gap-1 h-32">
            {activity.dailyActivity.map((day, i) => {
              const maxCount = Math.max(...activity.dailyActivity.map(d => d.count))
              const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.count} events`}>
                  <div
                    className="w-full bg-primary-500/60 rounded-t hover:bg-primary-400/80 transition-colors"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-neutral-500">
            <span>{activity.dailyActivity[0]?.date}</span>
            <span>{activity.dailyActivity[activity.dailyActivity.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Improve Your Score</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {healthScore && healthScore.components.contactEngagement < 50 && (
            <ActionCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="Send more messages"
              description="Reach out to your contacts to improve engagement"
              href="/contacts"
            />
          )}
          {healthScore && healthScore.components.campaignActivity < 50 && (
            <ActionCard
              icon={<Zap className="w-5 h-5" />}
              title="Launch a campaign"
              description="Create a reactivation campaign to win back customers"
              href="/campaigns"
            />
          )}
          {healthScore && healthScore.components.featureBreadth < 50 && (
            <ActionCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Explore more features"
              description="Discover tools you have not tried yet"
              href="/help"
            />
          )}
          {healthScore && healthScore.components.dataFreshness < 50 && (
            <ActionCard
              icon={<Users className="w-5 h-5" />}
              title="Update your contacts"
              description="Import new contacts or update existing ones"
              href="/data-center"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm text-neutral-400">{label}</span></div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}

function ScoreBar({ label, score, weight, detail }: { label: string; score: number; weight: number; detail: string }) {
  const getColor = (s: number) => {
    if (s >= 75) return 'bg-emerald-500'
    if (s >= 50) return 'bg-amber-500'
    if (s >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-200">{label}</span>
          <span className="text-xs text-neutral-500">({weight}% weight)</span>
        </div>
        <span className="text-sm font-bold text-white">{score}/100</span>
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${getColor(score)}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-neutral-500 mt-1">{detail}</p>
    </div>
  )
}

function ActionCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  return (
    <a href={href} className="flex items-center gap-3 p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg border border-neutral-700/50 transition-colors group">
      <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">{title}</div>
        <div className="text-xs text-neutral-500">{description}</div>
      </div>
      <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-primary-400 transition-colors" />
    </a>
  )
}