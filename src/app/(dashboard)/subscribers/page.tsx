"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Heart,
  AlertTriangle,
  AlertCircle,
  XCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Activity,
  Bell,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ExternalLink,
  BarChart3,
  MessageSquare,
  Calendar,
  Crown,
  Shield,
  Zap,
  Star,
} from 'lucide-react'

interface Subscriber {
  accountId: string
  businessName: string
  tier: string
  status: string
  industry: string
  businessSize: string
  onboardingComplete: boolean
  createdAt: string
  contacts: number
  mrr: number
  healthScore: number | null
  riskLevel: string
  trend: string
  lastScored: string | null
  componentScores: Record<string, number> | null
  interventions: { total: number; pending: number }
}

interface Summary {
  total: number
  healthy: number
  watch: number
  at_risk: number
  critical: number
  unscored: number
  mrr: number
  avgHealthScore: number
  totalContacts: number
  pendingInterventions: number
}

type SortField = 'health_score' | 'mrr' | 'contacts' | 'created'
type RiskFilter = '' | 'healthy' | 'watch' | 'at_risk' | 'critical' | 'unscored'
type TierFilter = '' | 'starter' | 'professional' | 'business' | 'enterprise'

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('')
  const [sortField, setSortField] = useState<SortField>('health_score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (riskFilter) params.set('risk', riskFilter)
      if (tierFilter) params.set('tier', tierFilter)
      params.set('sort', sortField)
      params.set('order', sortOrder)

      const res = await fetch(`/api/admin/subscribers?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSubscribers(data.subscribers || [])
        setSummary(data.summary || null)
      }
    } catch (err) {
      console.error('Failed to fetch subscribers:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [riskFilter, tierFilter, sortField, sortOrder])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filteredSubscribers = subscribers.filter(s =>
    searchQuery === '' ||
    s.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.industry.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount)
  }

  const getRiskBadge = (risk: string) => {
    const styles: Record<string, string> = {
      healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      watch: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      at_risk: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      critical: 'bg-red-500/10 text-red-400 border-red-500/20',
      unscored: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
    }
    const icons: Record<string, React.ReactNode> = {
      healthy: <Heart className="w-3 h-3" />,
      watch: <AlertTriangle className="w-3 h-3" />,
      at_risk: <AlertCircle className="w-3 h-3" />,
      critical: <XCircle className="w-3 h-3" />,
      unscored: <HelpCircle className="w-3 h-3" />,
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[risk] || styles.unscored}`}>
        {icons[risk] || icons.unscored}
        {risk.replace('_', ' ')}
      </span>
    )
  }

  const getTierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      starter: 'bg-neutral-500/10 text-neutral-300',
      professional: 'bg-blue-500/10 text-blue-400',
      business: 'bg-purple-500/10 text-purple-400',
      enterprise: 'bg-amber-500/10 text-amber-400',
    }
    const icons: Record<string, React.ReactNode> = {
      starter: <Star className="w-3 h-3" />,
      professional: <Shield className="w-3 h-3" />,
      business: <Crown className="w-3 h-3" />,
      enterprise: <Zap className="w-3 h-3" />,
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[tier.toLowerCase()] || styles.starter}`}>
        {icons[tier.toLowerCase()] || icons.starter}
        {tier}
      </span>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-3 h-3 text-emerald-400" />
      case 'declining': return <TrendingDown className="w-3 h-3 text-red-400" />
      default: return <Minus className="w-3 h-3 text-neutral-500" />
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-800 rounded w-64" />
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-neutral-800 rounded-lg" />)}
          </div>
          <div className="h-96 bg-neutral-800 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriber Command Centre</h1>
          <p className="text-neutral-400 mt-1">Monitor all platform subscribers, health scores, and revenue</p>
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard
            icon={<Users className="w-5 h-5 text-primary-400" />}
            label="Total Subscribers"
            value={summary.total.toString()}
            detail={`${summary.unscored} unscored`}
          />
          <SummaryCard
            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
            label="Monthly Revenue"
            value={formatCurrency(summary.mrr)}
            detail={`${formatCurrency(summary.mrr * 12)}/yr`}
          />
          <SummaryCard
            icon={<Activity className="w-5 h-5 text-amber-400" />}
            label="Avg Health Score"
            value={summary.avgHealthScore.toString()}
            detail="out of 100"
          />
          <SummaryCard
            icon={<MessageSquare className="w-5 h-5 text-blue-400" />}
            label="Total Contacts"
            value={summary.totalContacts.toLocaleString()}
            detail="across all accounts"
          />
          <SummaryCard
            icon={<Bell className="w-5 h-5 text-red-400" />}
            label="Pending Actions"
            value={summary.pendingInterventions.toString()}
            detail="interventions needed"
          />
        </div>
      )}

      {/* Risk Distribution */}
      {summary && summary.total > 0 && (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4">
          <div className="flex items-center gap-6">
            <span className="text-sm text-neutral-400">Risk Distribution:</span>
            <div className="flex-1 flex items-center gap-1 h-4 rounded-full overflow-hidden bg-neutral-800">
              {summary.healthy > 0 && (
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(summary.healthy / summary.total) * 100}%` }} title={`Healthy: ${summary.healthy}`} />
              )}
              {summary.watch > 0 && (
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${(summary.watch / summary.total) * 100}%` }} title={`Watch: ${summary.watch}`} />
              )}
              {summary.at_risk > 0 && (
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${(summary.at_risk / summary.total) * 100}%` }} title={`At Risk: ${summary.at_risk}`} />
              )}
              {summary.critical > 0 && (
                <div className="h-full bg-red-500 transition-all" style={{ width: `${(summary.critical / summary.total) * 100}%` }} title={`Critical: ${summary.critical}`} />
              )}
              {summary.unscored > 0 && (
                <div className="h-full bg-neutral-600 transition-all" style={{ width: `${(summary.unscored / summary.total) * 100}%` }} title={`Unscored: ${summary.unscored}`} />
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{summary.healthy}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{summary.watch}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />{summary.at_risk}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{summary.critical}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-600" />{summary.unscored}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by business name or industry..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value as RiskFilter)}
          className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300 focus:outline-none focus:border-primary-500"
        >
          <option value="">All Risk Levels</option>
          <option value="healthy">Healthy</option>
          <option value="watch">Watch</option>
          <option value="at_risk">At Risk</option>
          <option value="critical">Critical</option>
          <option value="unscored">Unscored</option>
        </select>

        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value as TierFilter)}
          className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300 focus:outline-none focus:border-primary-500"
        >
          <option value="">All Tiers</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Subscriber Table */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase">Business</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase cursor-pointer hover:text-white" onClick={() => handleSort('health_score')}>
                  <span className="flex items-center gap-1">Health {sortField === 'health_score' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase">Risk</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-neutral-400 uppercase cursor-pointer hover:text-white" onClick={() => handleSort('contacts')}>
                  <span className="flex items-center justify-end gap-1">Contacts {sortField === 'contacts' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-neutral-400 uppercase cursor-pointer hover:text-white" onClick={() => handleSort('mrr')}>
                  <span className="flex items-center justify-end gap-1">MRR {sortField === 'mrr' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-neutral-400 uppercase">Actions</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-neutral-400 uppercase cursor-pointer hover:text-white" onClick={() => handleSort('created')}>
                  <span className="flex items-center justify-center gap-1">Joined {sortField === 'created' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No subscribers found</p>
                    <p className="text-xs mt-1">Subscribers will appear here once accounts are created</p>
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map(sub => (
                  <>
                    <tr
                      key={sub.accountId}
                      className="border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === sub.accountId ? null : sub.accountId)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-white">{sub.businessName}</div>
                          <div className="text-xs text-neutral-500">{sub.industry} &middot; {sub.businessSize}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getTierBadge(sub.tier)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${sub.healthScore !== null ? (sub.healthScore >= 75 ? 'text-emerald-400' : sub.healthScore >= 50 ? 'text-amber-400' : sub.healthScore >= 25 ? 'text-orange-400' : 'text-red-400') : 'text-neutral-500'}`}>
                            {sub.healthScore !== null ? sub.healthScore : '—'}
                          </span>
                          {getTrendIcon(sub.trend)}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getRiskBadge(sub.riskLevel)}</td>
                      <td className="px-4 py-3 text-right text-sm text-neutral-300">{sub.contacts.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm text-neutral-300">{formatCurrency(sub.mrr)}</td>
                      <td className="px-4 py-3 text-center">
                        {sub.interventions.pending > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                            <Bell className="w-3 h-3" />
                            {sub.interventions.pending}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-neutral-500">
                        {new Date(sub.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expandedRow === sub.accountId && (
                      <tr key={`${sub.accountId}-detail`} className="bg-neutral-800/20">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Component Scores */}
                            <div>
                              <h4 className="text-xs font-medium text-neutral-400 uppercase mb-3">Health Components</h4>
                              {sub.componentScores ? (
                                <div className="space-y-2">
                                  {Object.entries(sub.componentScores).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <span className="text-xs text-neutral-400 w-28 truncate capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                      <div className="flex-1 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${(value as number) >= 75 ? 'bg-emerald-500' : (value as number) >= 50 ? 'bg-amber-500' : (value as number) >= 25 ? 'bg-orange-500' : 'bg-red-500'}`}
                                          style={{ width: `${value}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-mono text-neutral-300 w-8 text-right">{value as number}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-neutral-500">No health data yet</p>
                              )}
                            </div>

                            {/* Account Details */}
                            <div>
                              <h4 className="text-xs font-medium text-neutral-400 uppercase mb-3">Account Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Status</span>
                                  <span className={`font-medium ${sub.status === 'active' ? 'text-emerald-400' : 'text-neutral-400'}`}>{sub.status}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Onboarding</span>
                                  <span className={sub.onboardingComplete ? 'text-emerald-400' : 'text-amber-400'}>{sub.onboardingComplete ? 'Complete' : 'In Progress'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Last Scored</span>
                                  <span className="text-neutral-300">{sub.lastScored ? new Date(sub.lastScored).toLocaleDateString() : 'Never'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Interventions (30d)</span>
                                  <span className="text-neutral-300">{sub.interventions.total} total, {sub.interventions.pending} pending</span>
                                </div>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div>
                              <h4 className="text-xs font-medium text-neutral-400 uppercase mb-3">Quick Actions</h4>
                              <div className="space-y-2">
                                <button className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors">
                                  <MessageSquare className="w-4 h-4" />
                                  Send Check-in Message
                                </button>
                                <button className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors">
                                  <BarChart3 className="w-4 h-4" />
                                  View Full Report
                                </button>
                                <button className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors">
                                  <Calendar className="w-4 h-4" />
                                  Schedule Review Call
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Disconnect Dialog */}
      {disconnectTarget && (
        <WhatsAppDisconnectDialog
          open={!!disconnectTarget}
          onOpenChange={(open) => { if (!open) setDisconnectTarget(null); }}
          accountId={disconnectTarget.accountId}
          accountName={disconnectTarget.name}
          onDisconnected={() => {
            setDisconnectTarget(null);
            fetchSubscribers();
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-neutral-400">{label}</span></div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{detail}</div>
    </div>
  )
}